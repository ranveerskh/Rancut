# RanCut 0.6.1 Preview

- Feedback outbox: submitted messages retry with the same request ID, survive restart, and remain visibly pending until acknowledged by the server.
- Direct Windows update download, progress and cancellation. The app reports the installed version when no release exists, checks once daily, and can detect a public GitHub release automatically. The native process validates the approved GitHub release URL, byte size, SHA-256 and EXE header. Install now rechecks the downloaded file and waits for the existing project-save handshake before launching it.
- Companion Platform now has Overview, Licenses, Feedback and Releases. Feedback filters and private notes; refresh every 30 seconds without discarding unsaved notes. Release Manager accepts a direct installer URL, hash, size, version and notes.
- Required releases warn after 7 days and restrict Auto Edit after 30 days from server publication. Projects, saving and exports stay available. Optional releases never lock Auto Edit.
- Existing editor layout and logo retained. General editor redesign is outside this release.

Install this editor first. The new backend code is included in the companion platform folder but has NOT been deployed. Until the migrations and Edge Function are deployed, new services display setup-pending errors; feedback remains queued if the server does not accept it. Existing license actions continue using the existing endpoint.

This is not a signed Windows release. SHA-256 verifies the installer against release metadata; it does not replace publisher code signing or make the app impossible to modify.
