## About

Automates the process of paying back workers that previously participated in an Amazon Mechanical Turk (mTurk) experiment with us and for some reason or another did not receive compensation.

## Languages

Most of the application is written in NodeJS except for the email parser which is written in Python. However, the node application calls the python program as a system call.

## Files

- parse2.py
- repay.js

## .env File

Create a .env file with the following format:

```
AWS_ID=<your aws id>
AWS_KEY=<your aws key>

CLIENT_ID=<your client id>
CLIENT_SECRET=<your client secret>
REDIRECT_URL=<your redirect url>
ACCESS_TOKEN=<your access token>
REFRESH_TOKEN=<your refresh token>
EXPIRY_DATE=<your expiry date>
CODE=<your code>

EMAIL_LOGIN=<your email login>
EMAIL_PASSWORD=<your password>
```
Instructions on how to obtain your AWS id and your AWS key can be found on the Amazon Web Services documentation and instructions on how to obtain your client Id, client secret, redirect url, access token, refresh token, expiry date and code can be found on Google Auths page.

## Path
You must define the path of where the .data files are located. The `.data/repay` file will be in the same directory as the `.data/users` and the `.data/batch` files. Example:
```
const path = '../bang/.data/';
```

## Usage
```
$ node repay.js
```

## Fields in the Repay Database
This JSON file contains the following information for each user:

- Name => _str_
- Email => _str_
- WorkerID => _str_
- UniqueID => _str_
- BangHIT => _str_
- SentHIT => _boolean_
- SentBonus => _boolean_
- Bonus => _int_
