import aiohttp
import base64
import asyncio
from core.config import settings


SPEECHMATICS_BATCH_URL = "https://asr.api.speechmatics.com/v2"


class SpeechmaticsService:
    """
    Speechmatics provides highly accurate speech-to-text.
    We use the batch transcription API for audio snippets from the frontend.
    """

    def __init__(self):
        self.api_key = settings.speechmatics_api_key
        self.headers = {"Authorization": f"Bearer {self.api_key}"}

    async def transcribe_audio(self, audio_bytes: bytes, language: str = "en") -> str:
        """
        Submit audio for transcription and poll for result.
        audio_bytes: raw audio bytes (wav or mp3 format)
        """
        if not self.api_key or self.api_key == "your_speechmatics_api_key_here":
            return "[Voice transcription unavailable - configure SPEECHMATICS_API_KEY]"

        async with aiohttp.ClientSession() as session:
            # Step 1: Submit job
            job_id = await self._submit_job(session, audio_bytes, language)
            if not job_id:
                return "[Transcription failed: could not submit job]"

            # Step 2: Poll for result
            transcript = await self._poll_for_result(session, job_id)
            return transcript

    async def _submit_job(self, session: aiohttp.ClientSession, audio_bytes: bytes, language: str) -> str:
        """Submit a transcription job"""
        config = {
            "type": "transcription",
            "transcription_config": {
                "language": language,
                "operating_point": "enhanced",
                "diarization": "none",
            }
        }

        form = aiohttp.FormData()
        form.add_field("config", str(config).replace("'", '"'), content_type="application/json")
        form.add_field("data_file", audio_bytes, filename="audio.wav", content_type="audio/wav")

        async with session.post(
            f"{SPEECHMATICS_BATCH_URL}/jobs",
            headers=self.headers,
            data=form
        ) as resp:
            if resp.status == 201:
                data = await resp.json()
                return data.get("id", "")
            return ""

    async def _poll_for_result(self, session: aiohttp.ClientSession, job_id: str, max_wait: int = 60) -> str:
        """Poll for transcription result"""
        for _ in range(max_wait):
            await asyncio.sleep(1)
            async with session.get(
                f"{SPEECHMATICS_BATCH_URL}/jobs/{job_id}",
                headers=self.headers
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    status = data.get("job", {}).get("status", "")
                    if status == "done":
                        return await self._fetch_transcript(session, job_id)
                    elif status in ("error", "rejected"):
                        return "[Transcription failed]"

        return "[Transcription timed out]"

    async def _fetch_transcript(self, session: aiohttp.ClientSession, job_id: str) -> str:
        """Fetch the completed transcript"""
        async with session.get(
            f"{SPEECHMATICS_BATCH_URL}/jobs/{job_id}/transcript?format=txt",
            headers=self.headers
        ) as resp:
            if resp.status == 200:
                return await resp.text()
            return "[Could not fetch transcript]"

    async def transcribe_base64(self, audio_base64: str, language: str = "en") -> str:
        """Transcribe base64-encoded audio"""
        try:
            audio_bytes = base64.b64decode(audio_base64)
            return await self.transcribe_audio(audio_bytes, language)
        except Exception as e:
            return f"[Transcription error: {str(e)}]"


speechmatics = SpeechmaticsService()
