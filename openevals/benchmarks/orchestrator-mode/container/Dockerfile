ARG OPENEVAL_RUNTIME
FROM ${OPENEVAL_RUNTIME}

# The live setup's mise release; the checksum is the release's published SHA-256.
ARG MISE_VERSION=2026.9.12
ARG MISE_SHA256=e79ae57945034903aee8aa2ea66b4c7ca9cd4f4edd5a8a78a589cbae6d0f428a

# `/home/dev` is a per-run volume, so installs live outside it and the system config selects them.
# Installing with root's home keeps mise and pnpm caches out of the candidate's home.
ENV MISE_DATA_DIR=/opt/mise

# The live shell activates mise, so its tools, including Node, come first on PATH;
# the profile script keeps them first in login shells, whose profile resets PATH.
ENV PATH=/opt/mise/shims:$PATH

COPY mise.toml /etc/mise/config.toml

RUN curl -fsSL -o /usr/local/bin/mise "https://github.com/jdx/mise/releases/download/v${MISE_VERSION}/mise-v${MISE_VERSION}-linux-x64" \
    && echo "${MISE_SHA256}  /usr/local/bin/mise" | sha256sum -c - \
    && chmod 755 /usr/local/bin/mise \
    && HOME=/root mise install node pnpm \
    && HOME=/root mise install \
    && chown -R dev:dev /opt/mise \
    && echo 'PATH=/opt/mise/shims:$PATH' > /etc/profile.d/mise.sh
