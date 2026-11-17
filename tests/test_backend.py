import asyncio
import unittest
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException
from pydantic import ValidationError
from backend import main


class BackendTests(unittest.TestCase):
    def test_request_limits_and_supported_algorithms(self):
        with self.assertRaises(ValidationError):
            main.AskRequest(question='Explain', algorithm='hash')
        with self.assertRaises(ValidationError):
            main.AskRequest(question='Explain', page_text='x' * 24001)

    def test_step_and_page_reach_tutor(self):
        mock = AsyncMock(return_value='Compare the adjacent values.')
        with patch.object(main, 'complete', mock):
            result = asyncio.run(main.ask(main.AskRequest(
                question='Why?', algorithm='bubble', step={'values': [3, 1]},
                page_text='Bubble sort compares adjacent values.')))
        self.assertIn('Compare', result['answer'])
        context = mock.call_args.args[0][-1]['content']
        self.assertIn('[3, 1]', context)
        self.assertIn('Bubble sort compares', context)

    def test_generated_configuration_validation(self):
        for content in ['not JSON', '{"algorithm":"hash","values":[1]}',
                        '{"algorithm":"bubble","values":[1000]}']:
            with patch.object(main, 'complete', AsyncMock(return_value=content)):
                with self.assertRaises(HTTPException):
                    asyncio.run(main.configure(main.ConfigureRequest(question='Visualize')))

    def test_valid_configuration(self):
        with patch.object(main, 'complete', AsyncMock(return_value='{"algorithm":"binary","values":[1,3,7],"target":3}')):
            config = asyncio.run(main.configure(main.ConfigureRequest(question='Find 3')))
        self.assertEqual(config.algorithm, 'binary')
        self.assertEqual(config.target, 3)

    def test_missing_key(self):
        with patch.dict(main.os.environ, {'GROQ_API_KEY': ''}):
            with self.assertRaises(HTTPException) as error:
                asyncio.run(main.complete([]))
        self.assertEqual(error.exception.status_code, 503)


if __name__ == '__main__':
    unittest.main()
