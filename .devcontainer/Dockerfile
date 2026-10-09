FROM mcr.microsoft.com/devcontainers/python:1-3.12-bookworm

ARG CODEQL_VERSION=2.27.2
ARG CODEQL_SHA256=ac0a4ea06843577ed3a1f5af145756c3085ebfd42e59a5aff1b66489f29d16dc
ARG SYFT_VERSION=1.54.1
ARG SYFT_SHA256=c069905b391cc4c20a5ba65ad5c10be2a7ba074f8ea6ad203e24d14e303dad47
ARG GRYPE_VERSION=0.120.1
ARG GRYPE_SHA256=0a9ee97ef5ae2ee953b0a80098105052e846cdbe319a57d808b519c33cd1343d

USER root

RUN test "$(dpkg --print-architecture)" = "amd64" \
    && rm -f /etc/apt/sources.list.d/yarn.list \
    && apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install --yes --no-install-recommends \
        ca-certificates \
        curl \
        jq \
        unzip \
    && rm -rf /var/lib/apt/lists/*

RUN curl --fail --location --silent --show-error \
        "https://github.com/github/codeql-cli-binaries/releases/download/v${CODEQL_VERSION}/codeql-linux64.zip" \
        --output /tmp/codeql.zip \
    && echo "${CODEQL_SHA256}  /tmp/codeql.zip" | sha256sum --check --strict \
    && unzip -q /tmp/codeql.zip -d /opt \
    && ln -s /opt/codeql/codeql /usr/local/bin/codeql \
    && rm /tmp/codeql.zip

RUN curl --fail --location --silent --show-error \
        "https://github.com/anchore/syft/releases/download/v${SYFT_VERSION}/syft_${SYFT_VERSION}_linux_amd64.tar.gz" \
        --output /tmp/syft.tar.gz \
    && echo "${SYFT_SHA256}  /tmp/syft.tar.gz" | sha256sum --check --strict \
    && tar -xzf /tmp/syft.tar.gz -C /usr/local/bin syft \
    && rm /tmp/syft.tar.gz

RUN curl --fail --location --silent --show-error \
        "https://github.com/anchore/grype/releases/download/v${GRYPE_VERSION}/grype_${GRYPE_VERSION}_linux_amd64.tar.gz" \
        --output /tmp/grype.tar.gz \
    && echo "${GRYPE_SHA256}  /tmp/grype.tar.gz" | sha256sum --check --strict \
    && tar -xzf /tmp/grype.tar.gz -C /usr/local/bin grype \
    && rm /tmp/grype.tar.gz

USER vscode

RUN codeql pack download \
        codeql/python-queries@1.8.12 \
        codeql/javascript-queries@2.4.7 \
        codeql/ruby-queries@1.6.12
