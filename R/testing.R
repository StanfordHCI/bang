library("jsonlite", lib.loc="~/Library/R/3.3/library")
library("ggplot2", lib.loc="~/Library/R/3.3/library")
setwd(dirname(sys.frame(1)$ofile)) #if this is causing errors, check "Source on Save" then save.
getwd()
dataPath = "../.data"

# Returns a table of survey observations with a new column for round number
extractSurvey = function(frame,survey) {
  rounds = seq(1,length(frame$results.format[[1]]))
  roundResponses = lapply(rounds, function(round) {
    getCol = paste("results.",survey,".",round, sep="")
    surveyCols = Filter(function(x) grepl(getCol,x),names(frame))
    newCols = lapply(surveyCols, function(x) gsub(getCol,paste("results.",survey, sep=""),x) )
    surveyFrame = frame[,surveyCols]
    if (is.null(newCols)) {return("No newCols")}
    names(surveyFrame) = newCols
    surveyFrame$id = frame$id
    surveyFrame$round = round
    surveyFrame$room = ""
    surveyFrameRows = apply(surveyFrame,1,function(x){
      x$room = frame[frame$id == x['id'],]$rooms[round]
    })
    return(Reduce(rbind,surveyFrameRows))
  })
  return(Reduce(rbind,roundResponses))
}

# Returns factorized survey results
convertValues = function(x) { 
  yesNo = c("No","Yes")
  agreementLevels = c("Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree")
  if (any(as.character(x) == "Yes") || any(as.character(x) == "No")){
    levels = yesNo
  } else {
    levels = agreementLevels
  }
  return(as.numeric(factor(x,levels = levels, ordered = TRUE)))
}

survey = 'viabilityCheck'

batches = dir(dataPath, pattern = "^[0-9]+$" )
completeBatches = Filter(function(batch) { 
  if (any(dir(paste(dataPath,batch,sep="/")) == "batch.json") && (any(dir(paste(dataPath,batch,sep="/")) == "users.json")) ) {
    batchData = read_json(paste(dataPath,batch,"batch.json",sep="/"), simplifyVector = TRUE)
    return(any(batchData$batchComplete == TRUE))
  } 
  return(FALSE)
}, batches)


userFiles = lapply(completeBatches, function(batch){
  userFile = read_json(paste(dataPath,batch,"users.json",sep="/"), simplifyVector = TRUE)
  return(flatten(userFile, recursive = TRUE))
})

chatFiles = lapply(completeBatches, function(batch){
  chatFile = read_json(paste(dataPath,batch,"chats.json",sep="/"), simplifyVector = TRUE)
  return(flatten(chatFile, recursive = TRUE))
})

lapply(chatFiles, function(x) dim(x))

overlappingFiles = Reduce(function(x,y) merge(x, y, all=TRUE), userFiles)

roundsWithRooms = apply(overlappingFiles,1,function(x) {
  roomsForIndividual = lapply(seq(1,length(x$rooms)),function(y) {
    x$room = x$rooms[y]
    x$round = y
    return(x)
  })
  return(Reduce(rbind,roomsForIndividual))
})
finalRounds = as.data.frame(Reduce(rbind,roundsWithRooms))

myData = extractSurvey(overlappingFiles,survey)
myData = myData[complete.cases(myData),]

surveyCols = setdiff(names(myData), c("results.viabilityCheck.15", "id", "round"))

myData[surveyCols] = lapply(myData[surveyCols],convertValues)
myData$results.viabilityCheck.15 = convertValues(myData$results.viabilityCheck.15)

viabilitySurvey = myData[,surveyCols]
viabilityBinary = myData$results.viabilityCheck.15
