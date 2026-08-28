# Privacy

Fumble is a static client-side application. It has no Fumble account system, analytics
backend, advertising system, or application server.

The public instance is maintained by Krystian Pińczak. Current professional and email
contact channels are available at https://github.com/PKrystian. GitHub operates the
hosting infrastructure.

## Data stored on the device

Characters, layouts, initiative state, session notes, homebrew entries, soundboard
configuration, display preferences, and language preferences are stored in browser
localStorage. Character images and imported content may also be stored as encoded data.

This data is tied to the browser profile and site origin. Clearing site data, using private
browsing, changing origin, or reinstalling the browser can remove it. Fumble cannot recover
local data.

## Microphone

Speech transcription requests microphone access only after the user starts recording.
When available, the browser's built-in speech recognition service is used first. Depending
on the browser, that service may process audio through its own provider. If it is unavailable,
recorded chunks are processed in the browser with a local Whisper model downloaded from
Hugging Face and cached by the browser. Fumble does not upload recordings to a Fumble server.

## Third-party requests

The application may contact:

- the browser's speech recognition provider when built-in speech recognition is available
- `huggingface.co` and its subdomains to download the speech model
- `5e.tools` to display compendium images
- `youtube.com`, `youtube-nocookie.com`, and `img.youtube.com` for the soundboard
- any HTTPS image host referenced by user-provided wiki or imported content

Those providers receive normal web request information such as IP address, browser headers,
requested URL, and time of access. Their own privacy policies apply.

## Self-hosting

A self-hosted operator controls the server logs, domain, headers, analytics, and any
additional integrations. The operator is responsible for updating this notice to describe
their deployment.

## Contact

Privacy questions can be sent through the contact channels listed at
https://github.com/PKrystian. A repository discussion or issue can be used when the
message does not contain sensitive personal information.

The same information is available inside the application under `/legal/privacy` and
`/legal/connections`.
