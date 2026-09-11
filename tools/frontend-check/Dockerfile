FROM mcr.microsoft.com/playwright:v1.62.1-noble@sha256:dcc5531e97840b9b5e794f2814476b21571c5124a3fca2267d73041f56e7580e

ENV CHROME_PATH=/ms-playwright/chromium-1234/chrome-linux64/chrome

WORKDIR /repo/services/frontend

COPY services/frontend/package.json services/frontend/package-lock.json services/frontend/.npmrc ./
RUN npm ci && chown -R pwuser:pwuser /repo

WORKDIR /repo
COPY --chown=pwuser:pwuser . .

USER pwuser

CMD ["sh", "-c", "npm run build && npm run test:e2e"]
