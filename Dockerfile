FROM nginx

RUN curl -sL https://deb.nodesource.com/setup_20.x | bash - && \
	apt-get install -y nodejs &&\
	npm i -g npm@latest &&\
	node -v &&\
	npm -v

EXPOSE 3000 4173 5173 9323
