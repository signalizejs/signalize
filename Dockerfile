FROM node:alpine

RUN npm i -g pnpm

RUN node -v && \
	pnpm -v && \
	npm -v

EXPOSE 3000
