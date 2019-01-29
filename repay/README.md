
## About
This is a 4-part system that automates the process of paying back workers that previously participated in an Amazon Mechanical Turk (mTurk) experiment with us and for some reason or another did not receive compensation.

## Languages
This process involves two programs in NodeJS and two in Python. Programs that deal with creating new mTurk Human Intelligence Tasks (HITs) or parsing through existing submissions are written in NodeJS and those that involve reading and sending emails use Python.

## Files
- parseRepayEmails.py   => *Python*
- generateRepayHITs.js  => *NodeJS*
- sendRepayEmails.py    => *Python*
- bonusRepays.js        => *NodeJS*

## Dependencies
This program depends on the following databases for running successfully:
- .data/users
- .data/batch

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
$ python parseRepayEmails.py
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
$ python sendRepayEmails.py
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
