import asyncio
import unittest
from unittest.mock import AsyncMock, MagicMock, patch
import httpx
from backend import main

class ProviderTests(unittest.TestCase):
    def call(self,responses):
        client=MagicMock()
        client.post=AsyncMock(side_effect=responses)
        manager=MagicMock()
        manager.__aenter__=AsyncMock(return_value=client)
        manager.__aexit__=AsyncMock(return_value=False)
        with patch.dict(main.os.environ,{'GROQ_API_KEY':'test','GROQ_MODEL':'openai/gpt-oss-20b'}),patch.object(main.httpx,'AsyncClient',return_value=manager):
            try:
                result=asyncio.run(main.complete([{'role':'user','content':'Visualize TCP'}],True,schema={'type':'object','properties':{}}))
                return result,client
            except main.HTTPException as error:
                return error,client

    def test_provider_schema_failure_retries_once(self):
        failure=httpx.Response(400,json={'error':{'code':'json_validate_failed'}})
        success=httpx.Response(200,json={'choices':[{'finish_reason':'stop','message':{'content':'{"answer":"ok"}'}}]})
        result,client=self.call([failure,success])
        self.assertEqual(result,'{"answer":"ok"}')
        self.assertEqual(client.post.await_count,2)
        self.assertEqual(client.post.call_args.kwargs['json']['response_format']['type'],'json_object')

    def test_model_error_is_not_retried_and_exposes_safe_code(self):
        result,client=self.call([httpx.Response(400,json={'error':{'code':'model_decommissioned','message':'private input'}})])
        self.assertEqual(client.post.await_count,1)
        self.assertIn('model_decommissioned',result.detail)
        self.assertNotIn('private input',result.detail)

    def test_rate_limit_is_not_retried(self):
        result,client=self.call([httpx.Response(429,json={'error':{'code':'rate_limit_exceeded'}})])
        self.assertEqual(client.post.await_count,1)
        self.assertEqual(result.status_code,429)

if __name__=='__main__':
    unittest.main()
