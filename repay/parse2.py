import smtplib
import time
import imaplib
import email
import os
import json
from os.path import join, dirname
from dotenv import load_dotenv

load_dotenv('.env')
fromEmail = os.getenv('EMAIL_LOGIN')
fromPassword = os.getenv('EMAIL_PASSWORD')

imapServer = 'imap.gmail.com'
path = '../.data/'

workerName = ''
workerEmail = ''
workerId = ''

maxNumEmailsToRead = 100

def getBodyText(msg):
    if msg.is_multipart():
        return getBodyText(msg.get_payload(0))
    else:
        return msg.get_payload(None, True)

def getWorkerName(body):
    i = 0
    while i < len(body):
        if (body[i] == 'Message' and body[i + 1] == 'from'):
            return body[i + 2]
        i += 1
    return ''

def getWorkerEmail(body):
    i = 0
    while i < len(body):
        if (body[i][0] == '('):
            workerEmail = body[i].strip('(').strip(')')
            return workerEmail
        i += 1
    return ''

def getWorkerId(body):
    i = 0
    while i < len(body):
        if (body[i] == 'Worker' and body[i + 1] == 'ID:'):
            return body[i + 2]
        i += 1
    return ''

def readEmail():
    try:
        mail = imaplib.IMAP4_SSL(imapServer)
        mail.login(fromEmail, fromPassword)
        mail.select('inbox')

        result, data = mail.search(None, 'ALL')
        mailIds = data[0]
        mailIdList = mailIds.split()

        firstEmail = int(mailIdList[0])
        latestEmail = int(mailIdList[-1])

        x = 0

        for i in range(latestEmail, firstEmail, -1):
            x = x + 1
            if (x > maxNumEmailsToRead):
                break

            result, data = mail.fetch(str(i), '(RFC822)')

            for responsePart in data:
                if isinstance(responsePart, tuple):
                    msg = email.message_from_string(str(responsePart[1]))
                    emailSubject = str(msg['subject'])
                    emailSubjectSplit = emailSubject.split()
                    emailFrom = msg['from']
                    emailBody = getBodyText(msg)
                    emailBodySplit = emailBody.split()
                    if (emailSubjectSplit[0] == 'Regarding' and emailSubjectSplit[1] == 'Amazon' and emailSubjectSplit[2] == 'Mechanical' and emailSubjectSplit[3] == 'Turk'):
                        print('Name: ' + getWorkerName(emailBodySplit))
                        print('Email: ' + getWorkerEmail(emailBodySplit))
                        print('WorkerId: ' + getWorkerId(emailBodySplit))
                        print('hitId: ' + emailSubjectSplit[-1])

    except Exception as e:
        print(str(e))

readEmail()
