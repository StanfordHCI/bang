
## About
This is a 4-part system that automates the process of paying back workers that previously participated in an Amazon Mechanical Turk (mTurk) experiment with us and for some reason or another did not receive compensation.

## Languages
This process involves two programs in NodeJS and two in Python. Programs that deal with creating new mTurk Human Intelligence Tasks (HITs) or parsing through existing submissions are written in NodeJS and those that involve reading and sending emails use Python.

## Files
- parseRepayEmails.py   => *Python*
- generateRepayHITs.js  => *NodeJS*
- sendRepayEmails.py    => *Python*
- bonusRepays.js        => *NodeJS*

## .env File
Create a .env file with the following information
```
AWS_ID=<your aws id>
AWS_KEY=<your aws key>

EMAIL_LOGIN=<your email login>
EMAIL_PASSWORD=<your password>
```

## Creating a virtual environment for running Python Files
1) A virtual environment is recommended in order to successfully run Python files. To download `virtualenv` run:
```
$ python -m pip install --user virtualenv
```

2) The installation will provide a `PATH` where the executable is located. You can either copy that path and run
```
$ /path/to/virtualenv ENV
```
or you can permanently change the path by running this once:
```
$ export PATH=$PATH:/path/to/
```
*without* the name `virtualenv` at the end
and then you'll be able to run the simpler
```
$ virtualenv ENV
```

3) To activate the virutal environment run:
```
$ source ENV/bin/activate
```
_Note: the word source is not code for anything; you can type the word source._

4) You're now in the virtual environment! To install all dependencies do:
```
$ python -m pip install -r requirements.txt
```

5) Now you can successfully run the python programs as you normally would.
```
$ python3 <name of file>
```

6) To exit the virtual environment type:
```
$ deactivate
```
This will be useful for when you run other types of programs (e.g. NodeJS).

## Dependencies
This program depends on the following databases for running successfully:
- .data/users
- .data/batch

Make sure that the files' database variables contain the correct path:
Example
.py files:
```python
database = '../.data/repay'
```
.js files;
```javascript
const database = '../.data/repay';
```

This program also creates a new database called *.data/repay* to track people that are corresponding with us. This JSON file contains the following information for each user:
- Name      => *str*
- Email     => *str*
- WorkerID  => *str*
- UniqueID  => *str*
- BangHIT   => *str*
- SentHIT   => *boolean*
- SentBonus => *boolean*
- Bonus     => *int*

## parseRepayEmails.py
### Usage
```
$ python3 parseRepayEmails.py
```
### Configuration
Current configuration assumes the domain for the email linked with the mTurk requester account is an outlook one (@stanford.edu). If that changes to, say, a gmail one, change the variable:
```python
imapServer = "outlook.office365.com"
```
to the following:
```python
imapServer = "imap.gmail.com"
```

## generateRepayHITs.js
### Usage
```
$ node generateRepayHITs.js
```

## sendRepayEmails.py
### Usage
```
$ python3 sendRepayEmails.py
```
### Configuration
If the domain of the email that will reply to users is not a Stanford one, change the variable:
```python
SMTP_SERVER = "smtp.stanford.edu"
```
to either `"mail.domain.com"` or `"smtp.domain.com"`. If neither of those work, try [NSLOOKUP](www.exclamationsoft.com/exclamationsoft/netmailbot/help/website/HowToFindTheSMTPMailServerForAnEmailAddress.html).

## bonusRepays.js
### Usage
```
$ node bonusRepays.js
```
