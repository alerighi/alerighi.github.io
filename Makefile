build:
	bundle exec jekyll build

preview:
	bundle exec jekyll serve

prepare:
	bundle config path vendor/bundler
	bundle install
