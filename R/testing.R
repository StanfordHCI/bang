library("jsonlite", lib.loc="~/Library/R/3.3/library")
setwd(dirname(sys.frame(1)$ofile))
getwd()
dataPath = "../.data"

# Returns a table of survey observations with a new column for round number
extractSurvey = function(frame,survey) {
  rounds = range(1,length(frame$results.format[[1]]))
  roundResponses = lapply(rounds, function(round) {
    getCol = paste("results.",survey,".",round, sep="")
    surveyCols = Filter(function(x) grepl(getCol,x),names(frame))
    newCols = lapply(surveyCols, function(x) gsub(getCol,paste("results.",survey, sep=""),x) )
    surveyFrame = frame[,surveyCols]
    if (is.null(newCols)) {return("No newCols")}
    names(surveyFrame) = newCols
    surveyFrame$id = frame$id
    surveyFrame$round = round
    return(surveyFrame)
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

overlappingFiles = Reduce(function(x,y) {
  merge(x, y, all=TRUE)
}, userFiles)

myData = extractSurvey(overlappingFiles,survey)
myData = myData[complete.cases(myData),]

surveyCols = setdiff(names(myData), c("results.viabilityCheck.15", "id", "round"))

myData[surveyCols] = lapply(myData[surveyCols],convertValues)
myData$results.viabilityCheck.15 = convertValues(myData$results.viabilityCheck.15)

viabilitySurvey = myData[,surveyCols]
viabilityBinary = myData$results.viabilityCheck.15

summary(lm(viabilityBinary ~., viabilitySurvey))
plot(viabilitySurvey,viabilityBinary)
