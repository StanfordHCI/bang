#!/usr/bin/env python
# coding: utf-8

# In[44]:

import pickle
import json
import ast 
import pandas as pd
import numpy as np
from IPython import display
import pickle
from collections import defaultdict
import re
from bs4 import BeautifulSoup
import sys
import os
os.environ['KERAS_BACKEND']='theano'
import tensorflow as tf

from tensorflow.keras.preprocessing.text import Tokenizer
from tensorflow.keras.preprocessing.sequence import pad_sequences
from tensorflow.keras.utils import to_categorical
from tensorflow.keras.layers import Embedding
from tensorflow.keras.layers import Dense, Input, Flatten
from tensorflow.keras.layers import Conv1D, MaxPooling1D, Embedding, Dropout
from tensorflow.keras.models import Model
from tensorflow.keras.callbacks import ModelCheckpoint

from sklearn.feature_extraction.text import CountVectorizer
from sklearn.feature_extraction.text import TfidfTransformer
from sklearn.neighbors import KNeighborsClassifier

def loadBatch(batchNumber):
    data = []
    path = '.data/' + str(batchNumber) + '/chats.json'
    try:
        with open(path, 'r') as f:
            chat = json.load(f)
            data.append(chat)
    except Exception as e:
        print('error: ' + path)
    return data
    
def splitDataIntoInteractions(data, thisRound):
    frame = {}
    for _ in data:
        batch = [(chat["round"] + 1, chat["room"], chat["userID"], chat["message"], chat["time"]) 
                       for chat in _]

        # get relevant round
        for instance in batch[:]:
            if str(instance[0]) != thisRound or instance[1] == '':
                batch.remove(instance)
        
        if (len(batch) < 1):
            return None

        batch = pd.DataFrame(batch)
        # print(batch)

        batch.columns = ["round", "team", "userID", "message", "time"]
        batch = batch.sort_values(["round", "team", "time"])
        batch.index = np.arange(1, batch.shape[0] + 1)
        for index, row in batch.iterrows():
            identifier = tuple([_[0]["batch"], row["round"], row["team"]])
            if identifier not in frame.keys():
                frame[identifier] = {"message": [row["message"]]}
            else:
                frame[identifier]["message"].append(row["message"])
    return frame

def getMessages(frame):
    return [(val["message"]) for key, val in frame.items()]

# Necessary to pass in as tokenizer and preprocessor
# in CountVectorizer in the function transformData.
# Without it the program crashes
# Idea came from:
# https://stackoverflow.com/questions/35867484/pass-tokens-to-countvectorizer
def dummy(doc):
    return doc

def transformData(chats):
    transformer = TfidfTransformer()
    loaded_vectorizer = CountVectorizer(tokenizer=dummy, preprocessor=dummy, vocabulary=pickle.load(open('vectorizer.sav', 'rb')))
    tfidf = transformer.fit_transform(loaded_vectorizer.fit_transform(chats))
    X = tfidf.toarray()
    return np.array(X)

def predict(X):
    knn = pickle.load(open('knn.sav', 'rb'))
    prediction = knn.predict(X)
    return prediction

def main():
    thisBatch = sys.argv[1]
    thisRound = sys.argv[2]
    
    path = "./.data/" + str(thisBatch) + '/prediction.json'
    try:
        with open(path) as infile:
            predictionJSON = json.load(infile)
    except Exception as e:
        predictionJSON = {}

    predictionJSON[thisRound] = []
    rooms = ['A', 'B', 'C', 'D']
    
    data = loadBatch(thisBatch)
    frame = splitDataIntoInteractions(data, thisRound)
    if (frame != None):
        chats = getMessages(frame)
        X = transformData(chats)
        predictions = predict(X)
        i = 0
        for prediction in predictions:
            predictionJSON[thisRound].append({
                rooms[i]: prediction
            })
            i += 1
 
    try:
        with open(path, 'w') as outfile:
            json.dump(predictionJSON, outfile)
    except Exception as e:
        print('error: ' + str(e))

main()

# ### 

# In`[ ]:
