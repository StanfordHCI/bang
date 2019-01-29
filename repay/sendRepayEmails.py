
"""
sendRepayEmails.py is the third program in the sequence.

It looks at the database and if there are any users who
have not been sent HITs but have a repayURL, we'll send
them emails with instructions.
"""
import smtplib
import time
import imaplib
import email
import json
import os
from os.path import join, dirname
from dotenv import load_dotenv

# Credentials
dotenv_path = join(dirname(__file__), '.env')
load_dotenv(dotenv_path)
FROM_EMAIL = os.getenv('EMAIL_LOGIN')
FROM_PWD = os.getenv('EMAIL_PASSWORD')
IMAP_SERVER = "outlook.office365.com"
SMTP_SERVER = "smtp.stanford.edu"
SMTP_PORT = 587
database = '../bang/.data/repay'
repayUserDatabase = []

try:
	mail = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
	mail.starttls()
	mail.login(FROM_EMAIL, FROM_PWD)
except Exception, e:
    	print str(e)

with open(database) as json_file:
    	repayUserDatabase = json.load(json_file)

for user in repayUserDatabase:
    	if user['SentHIT'] == False and user['RepayURL'] != "" and user['RepayURL'] != None:
        	TO_EMAIL_ADDRESS = user['Email']

        	# This format is necessary to be able to include a subject line
        	MESSAGE = "From: HIT: " + user['BangHIT'] + " <" + FROM_EMAIL + ">\n"
        	MESSAGE += "To: " + user['Name'] + " <" + TO_EMAIL_ADDRESS + ">\n"
		MESSAGE += "MIME-Version: 1.0\nContent-type: text/html\n"
		MESSAGE += "Subject: Regarding Amazon Mechanical Turk Compensation\n\n"

		# Actual message
		MESSAGE += 'Hi ' + user['Name'] + ',\n\nThanks for reaching out.'
		MESSAGE += '\nHere\'s a repay hit:\n\n' + str(user['RepayURL'])
		MESSAGE += '\n\nIf that does not work, please try searching for'
		MESSAGE += ' Stanford, and select a hit titled "Hit to repay workers".'
		MESSAGE += '\nPlease use your worker ID when prompted. We will check '
		MESSAGE += 'this against our database.'
		MESSAGE += '\nWe anticipate paying out bonuses sometime in the next 48 hours.'

		try:
			mail.sendmail(FROM_EMAIL, TO_EMAIL_ADDRESS, MESSAGE)
			user['SentHIT'] = True
			print 'Sent repay link to ' + user['Name'] + ' at: ' + user['Email']
		except Exception, e:
			print str(e)

mail.quit()

# write updated information to our file
with open(database, 'w') as outfile:
    json.dump(repayUserDatabase, outfile)
