# SPDX-FileCopyrightText: the secureCodeBox authors
#
# SPDX-License-Identifier: Apache-2.0

FROM python:3.10.2-alpine
RUN set -ex; \
    addgroup --system --gid 1001 zap-client && adduser zap-client --system --uid 1001 --ingroup zap-client;\
    apk update && apk add --no-cache npm ;\
    npm install -g newman ;\
    npm config set strict-ssl=false; \
    newman -v
COPY . /zap-client/
RUN pip3 install --no-cache-dir -r /zap-client/requirements.txt
USER 1001
CMD ["/bin/sh"]
WORKDIR /zap-client
ENTRYPOINT ["python3", "-m", "zapclient"]
