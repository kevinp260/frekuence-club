FROM mcr.microsoft.com/playwright:v1.62.1-noble@sha256:dcc5531e97840b9b5e794f2814476b21571c5124a3fca2267d73041f56e7580e

WORKDIR /review

COPY package.json package-lock.json .npmrc ./
RUN npm ci && chown -R pwuser:pwuser /review

COPY --chown=pwuser:pwuser capture-staff-review.mjs ./capture-staff-review.mjs

USER pwuser

CMD ["node", "capture-staff-review.mjs"]
