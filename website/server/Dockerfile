FROM node:19.5-alpine3.16

WORKDIR /website
ENV PATH="./node_modules/.bin:$PATH"

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

WORKDIR /website/server
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

CMD ["npm", "start"]