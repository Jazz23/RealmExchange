#!/bin/bash

# Require an argument to be passed to this script
if [ "$#" -eq 0 ]; then
    echo "Usage: ./sendemail.sh [a]"
    exit 1
fi

ARG="$1"

curl --request POST 'http://localhost:8787/cdn-cgi/handler/email' \
  --url-query 'from=noreply@decagames.com' \
  --url-query 'to=recipient@example.com' \
  --header 'Content-Type: application/json' \
  --data-raw "Received: from smtp.example.com (127.0.0.1)
        by cloudflare-email.com (unknown) id 4fwwffRXOpyR
        for <recipient@example.com>; Tue, 27 Aug 2024 15:50:20 +0000
From: \"John\" <noreply@decagames.com>
Reply-To: noreply@decagames.com
To: recipient@example.com
Subject: Verify Email for Realm of the Mad God
Content-Type: text/html; charset=\"windows-1252\"
X-Mailer: Curl
Date: Tue, 27 Aug 2024 08:49:44 -0700
Message-ID: <6114391943504294873000@ZSH-GHOSTTY>

Here is your link buddy: https://www.realmofthemadgod.com/account/v?b=cE6D-5qkMRyY6M9j&a=$ARG"
