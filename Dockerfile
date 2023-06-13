FROM node

RUN npm install -g pnpm &&\
	node -v &&\
	npm -v &&\
	pnpm -v

EXPOSE 3000 4173 5173 9323
