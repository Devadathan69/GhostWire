# Ghostwire demo

[Watch the demo with audio in the README](https://github.com/Devadathan69/GhostWire#demo-video) · [Open/download the repository copy](ghostwire-demo.mp4)

The owner-provided recording shows creating an Avengers-inspired world, reviewing its editable heroes and powers, joining a two-hero lobby, and playing with camera-based motion controls. It is presentation footage, separate from the automated victory and Reality Breach evidence in [the verification record](../docs/LIVE_AI_VERIFICATION.md).

- Duration: 2 minutes 24.60 seconds (displayed as 2:25).
- Video: 1920 × 1080, 30 fps, H.264 with browser-friendly fast-start metadata.
- Audio: original AAC stereo stream, copied unchanged.
- Repository copy: `ghostwire-demo.mp4`, 9,026,862 bytes (about 9 MB).

The local source `GhostWire Demo.mp4` is 117,459,641 bytes, above GitHub's normal 100 MiB file limit. It is preserved unchanged and excluded from Git by this folder's `.gitignore`. The smaller copy keeps the complete duration and resolution while re-encoding the video. [GitHub file-size documentation](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github).

Preparation used [FFmpeg](https://ffmpeg.org/) with libx264 (CRF 25, fast preset), copying the audio stream and moving MP4 metadata to the beginning. FFmpeg is a media-preparation tool, not a game runtime dependency. Validation decoded the entire published copy without errors, checked its media properties, compared the original/copy audio hashes, and sampled frames for visual review.

The recording's invite codes are historical. Use [the phone walkthrough](../docs/PHONE_TEST.md) to create a new lobby.
