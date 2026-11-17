import asyncio
import unittest
from unittest.mock import AsyncMock, patch
from pydantic import ValidationError
from backend.planning import VisualPlan, ExploreRequest, page_excerpt, parse_visual_plan, visual_schema
from backend import main

def array(algorithm='linear', values=None):
    return dict(tool='array',title=algorithm,reason='Compare search behavior',illustrative=True,algorithm=algorithm,values=values or [1,3,7,9],target=7)

def plan(tools,compare=False):
    return dict(answer='Explanation',outside_page=False,compare=compare,evidence=[],tools=tools)

class PlanningTests(unittest.TestCase):
    def test_strict_schema_requires_every_tool_field(self):
        schema=visual_schema()
        def check(node):
            if isinstance(node,dict):
                self.assertNotIn('oneOf',node)
                self.assertNotIn('discriminator',node)
                if node.get('type')=='object':
                    self.assertFalse(node['additionalProperties'])
                    self.assertEqual(set(node['required']),set(node.get('properties',{})))
                for value in node.values():check(value)
            elif isinstance(node,list):
                for value in node:check(value)
        check(schema)
        self.assertIn('scenes',schema['$defs']['GeneralTool']['required'])
        self.assertIn('title',schema['$defs']['GeneralTool']['required'])
        self.assertIn('title',schema['$defs']['GeneralTool']['properties'])

    def test_missing_general_fields_are_repaired_once(self):
        import json
        bad=plan([dict(tool='general',title='A star',reason='Search',illustrative=True)])
        good=plan([dict(tool='general',title='A star',reason='Search',illustrative=True,layout='flow',nodes=[dict(id='a',label='Evaluate f=g+h')],links=[],scenes=[dict(caption='Choose the lowest estimated cost.',active=['a'])])])
        with patch.object(main,'complete',AsyncMock(side_effect=[json.dumps(bad),json.dumps(good)])) as mock:
            result=asyncio.run(main.explore(ExploreRequest(question='Visualize A star')))
        self.assertEqual(mock.await_count,2)
        self.assertEqual(len(result.tools[0].scenes),1)
        self.assertIn('schema',mock.call_args.kwargs)
        self.assertIn('Validation issues',mock.call_args.args[0][-1]['content'])

    def test_invalid_repair_never_loops(self):
        with patch.object(main,'complete',AsyncMock(return_value='not JSON')) as mock:
            with self.assertRaises(main.HTTPException):
                asyncio.run(main.explore(ExploreRequest(question='Visualize A star')))
        self.assertEqual(mock.await_count,2)

    def test_followup_context_is_sent_to_planner(self):
        with patch.object(main,'complete',AsyncMock(return_value=__import__('json').dumps(plan([])))) as mock:
            asyncio.run(main.explore(ExploreRequest(question='How is it different from Dijkstra?',previous_question='Explain A star search',previous_answer='A star uses a heuristic.',previous_topics=['A star search'])))
        payload=__import__('json').loads(mock.call_args.args[0][-1]['content'])
        self.assertEqual(payload['previous_topics'],['A star search'])
        self.assertEqual(payload['previous_question'],'Explain A star search')

    def test_invalid_astar_tool_preserves_explanation_and_valid_tool(self):
        tools=[dict(tool='graph',algorithm='astar'),array()]
        result=parse_visual_plan(__import__('json').dumps(plan(tools,True)))
        self.assertEqual(result.answer,'Explanation')
        self.assertEqual(len(result.tools),1)
        self.assertFalse(result.compare)
        self.assertTrue(result.visual_note)

    def test_single_general_comparison_and_fenced_json(self):
        tool=dict(tool='general',title='A star vs Dijkstra',reason='Explain search strategies',illustrative=True,layout='comparison',nodes=[dict(id='a',label='A star'),dict(id='d',label='Dijkstra')],links=[],scenes=[dict(caption='A star adds a heuristic.',active=['a'])])
        result=parse_visual_plan('```json\n'+__import__('json').dumps(plan([tool],True))+'\n```')
        self.assertTrue(result.compare)
        self.assertEqual(result.tools[0].tool,'general')

    def test_bad_comparison_does_not_silently_change_example_values(self):
        result=parse_visual_plan(__import__('json').dumps(plan([array(),array('binary',[1,2,7])],True)))
        self.assertEqual(result.tools,[])
        self.assertEqual(result.answer,'Explanation')
        self.assertTrue(result.visual_note)

    def test_comparison_preserves_shared_inputs(self):
        p=VisualPlan.model_validate(plan([array(),array('binary')],True))
        self.assertEqual(p.tools[0].values,p.tools[1].values)
        with self.assertRaises(ValidationError):
            VisualPlan.model_validate(plan([array(),array('binary',[1,2,7])],True))

    def test_unsupported_algorithm_and_invalid_inputs_rejected(self):
        for tool in [array('invented'),array('binary',[9,1]),array('rotated',[3,1,4,2])]:
            with self.assertRaises(ValidationError):
                VisualPlan.model_validate(plan([tool]))

    def test_general_tool_uses_validated_scene_references(self):
        tool=dict(tool='general',title='TCP',reason='Protocol stages',illustrative=False,layout='sequence',nodes=[dict(id='client',label='Client'),dict(id='server',label='Server')],links=[dict(source='client',target='server',label='SYN')],scenes=[dict(caption='Client sends SYN',active=['client'])])
        self.assertEqual(VisualPlan.model_validate(plan([tool])).tools[0].tool,'general')
        tool['scenes'][0]['active']=['missing']
        with self.assertRaises(ValidationError):
            VisualPlan.model_validate(plan([tool]))

    def test_graph_direction_and_schedule_limits(self):
        tool=dict(tool='graph',title='MST',reason='Minimum tree',illustrative=True,algorithm='kruskal',nodes=['A','B'],edges=[dict(source='A',target='B',weight=2)],directed=True,source='A',target='B')
        with self.assertRaises(ValidationError):
            VisualPlan.model_validate(plan([tool]))
        tool=dict(tool='schedule',title='RR',reason='Scheduling',illustrative=True,algorithm='rr',processes=[dict(id='A',arrival=0,burst=3,priority=0)],quantum=0)
        with self.assertRaises(ValidationError):
            VisualPlan.model_validate(plan([tool]))

    def test_page_relevance_and_exact_evidence(self):
        data=plan([array()]);data['evidence']=['Binary search halves the range.','Fabricated quote']
        with patch.object(main,'complete',AsyncMock(return_value=__import__('json').dumps(data))) as mock:
            result=asyncio.run(main.explore(ExploreRequest(question='Visualize this page',page_text='Binary search halves the range.')))
        self.assertEqual(result.evidence,['Binary search halves the range.'])
        self.assertIn('Binary search halves',mock.call_args.args[0][-1]['content'])

    def test_missing_page_label_and_invalid_json(self):
        with patch.object(main,'complete',AsyncMock(return_value=__import__('json').dumps(plan([])))):
            self.assertTrue(asyncio.run(main.explore(ExploreRequest(question='Explain TCP'))).outside_page)
        with patch.object(main,'complete',AsyncMock(return_value='not JSON')):
            with self.assertRaises(main.HTTPException):
                asyncio.run(main.explore(ExploreRequest(question='Explain TCP')))

    def test_excerpt_is_bounded_and_keeps_relevant_section(self):
        text='unrelated '*1500+' Round Robin quantum scheduling '*100
        self.assertLessEqual(len(page_excerpt(text,'Round Robin')),6500)
        self.assertIn('Round Robin',page_excerpt(text,'Round Robin'))

if __name__=='__main__':
    unittest.main()
