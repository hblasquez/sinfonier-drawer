PREFIX ?= /usr/local
LIB_PREFIX = ~/.node_libraries

test:
	@NODE_ENV=test expresso \
		-I lib \
		-I app \
		$(TESTFLAGS) \
		test/*.test.js

test-cov:
	@TESTFLAGS=--cov $(MAKE) test

.PHONY: docs docclean test test-cov