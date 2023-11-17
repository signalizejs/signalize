FROM node

RUN node -v &&\
	npm -v

EXPOSE 3000 4173 5173 9323
