# Artifact sharing

- **Behavior:** Copy the viewable artifact, such as an HTML page, image, or video, into `/home/mark/workspace/artifacts/share/`, using a descriptive subfolder so it does not overwrite earlier files, and reply with its URL-encoded link under `https://grif-wsl.atlas-chicken.ts.net/`.
- **Fact:** The link is reachable only on the user's tailnet. `artifact-share.service` serves the folder on `127.0.0.1:8787`, and the `grif-wsl` Tailscale Serve configuration publishes it.
