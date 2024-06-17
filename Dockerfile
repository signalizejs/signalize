FROM nginx

RUN curl -sL https://deb.nodesource.com/setup_22.x | bash - && \
	apt-get install -y nodejs &&\
	npm i -g npm@latest &&\
	node -v &&\
	npm -v
