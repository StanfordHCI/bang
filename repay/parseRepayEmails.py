
"""
parseRepayEmails.py is the first file to be called when completing repays.

It looks through all the emails and adds info on new complaints to the database.
Other programs will then execute the next steps based on this information:
    Creating new HITs
    Sending emails
    Repaying those who completed HITs
"""

import smtplib
import time
import imaplib
import email
import os
import json
from os.path import join, dirname
from dotenv import load_dotenv

# Credentials
dotenv_path = join(dirname(__file__), '.env')
load_dotenv(dotenv_path)
fromEmail = os.getenv('EMAIL_LOGIN')
fromPassword = os.getenv('EMAIL_PASSWORD')

# Change this to 'imap.gmail.com' if you want to read from a gmail domain account
imapServer = "outlook.office365.com"

# This will store the hitIDs of people who contact us via email
database = '../.data/repay'

# Worker info
workerName = ""
workerEmail = ""
workerID = ""

# Recursive function to get the actual body of the email
def getBodyText(msg):
    if msg.is_multipart():
        return getBodyText(msg.get_payload(0))
    else:
        return msg.get_payload(None, True)

# Gets 3 pieces of worker info in the body of email:
# First name
# Email
# Worker ID
def getWorkerName(body):
    i = 0
    while i < len(body):
        if (body[i] == 'Message' and body[i + 1] == 'from'):
            return body[i + 2]
        i += 1
    return ""

def getWorkerEmail(body):
    i = 0
    while i < len(body):
        if (body[i][0] == '('):
            workerEmail = body[i].strip('(').strip(')')
            return workerEmail
        i += 1
    return ""

def getWorkerID(body):
    i = 0
    while i < len(body):
        if body[i] == 'Worker' and body[i + 1] == 'ID:':
            return body[i + 2]
        i += 1
    return ""

# main function
def readEmailFromGmail():
    try:
        # Setting up email config
        mail = imaplib.IMAP4_SSL(imapServer)
        mail.login(fromEmail, fromPassword)
        mail.select('inbox')

        result, data = mail.search(None, 'ALL')

        mailIDs = data[0]

        mailIDList = mailIDs.split()
        firstEmailID = int(mailIDList[0])
        latestEmailID = int(mailIDList[-1])

        repayUserDatabase = []

        # Loads current information from database
        # into a Dictionary that can be added to
        with open(database) as json_file:
            repayUserDatabase = json.load(json_file)

        # To keep track of number of complaint emails found
        numEmailsFound = 0

        # To not do all of my emails
        x = 0
        
        # Loops through all emails from newest to oldest
        for i in range(latestEmailID, firstEmailID, -1):
            x = x + 1
            if (x > 100):
                break
            result, data = mail.fetch(str(i),  "(RFC822)")

            for responsePart in data:
                if isinstance(responsePart, tuple):
                    msg = email.message_from_string(str(responsePart[1]))
                    emailSubject = str(msg['subject'])
                    emailSubjectSplit = emailSubject.split()
                    emailFrom = msg['from']
                    emailBody = getBodyText(msg)
                    emailBodySplit = emailBody.split()
                    if (emailSubjectSplit[0] == 'Regarding' and emailSubjectSplit[1] == 'Amazon' and emailSubjectSplit[2] == 'Mechanical' and emailSubjectSplit[3] == 'Turk'):
                        workerName = getWorkerName(emailBodySplit)
                        workerEmail = getWorkerEmail(emailBodySplit)
                        workerID = getWorkerID(emailBodySplit)
                        hitID = emailSubjectSplit[-1]
                        shouldAppend = True
                        for user in repayUserDatabase:
                            if user['WorkerID'] == workerID:
                                shouldAppend = False
                                break
                        if shouldAppend:
                            numEmailsFound += 1
                            repayUserDatabase.append({"Name": workerName, "Email": workerEmail, "WorkerID": workerID, "UniqueID": "", "BangHIT": hitID, "RepayURL": "", "SentHIT": False, "SentBonus": False, "Bonus": 0})

        print ("Number of new complaint emails found: " + str(numEmailsFound))

        if (numEmailsFound > 0):
            with open(database, 'w') as outfile:
                json.dump(repayUserDatabase, outfile)
            print ('Added users to ' + database)

    except Exception as e:
        print (str(e))


readEmailFromGmail()
