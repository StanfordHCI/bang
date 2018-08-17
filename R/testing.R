library("jsonlite", lib.loc="~/Library/R/3.3/library")
input = ''
data = flatten(fromJSON(input),recursive = TRUE)

# Returns a table of survey observations with a new column for round number
extractSurvey = function(frame,survey) {
  rounds = range(1,length(frame$results.format[[1]]))
  roundResponses = lapply(rounds, function(round) {
    getCol = paste("results.",survey,".",round, sep="")
    surveyCols = Filter(function(x) grepl(getCol,x),names(frame))
    newCols = lapply(surveyCols, function(x) gsub(getCol,paste("results.",survey, sep=""),x) )
    surveyFrame = frame[,surveyCols]
    names(surveyFrame) = newCols
    surveyFrame$id = frame$id
    surveyFrame$round = round
    return(surveyFrame)
  })
  return(Reduce(rbind,roundResponses))
}

survey = 'viabilityCheck'
extractSurvey(data,survey)

path = "../.data"
batches = dir(path, pattern = "^[0-9]+$" )
completeBatches = Filter(function(batch) { 
  if (any(dir(paste(path,batch,sep="/")) == "batch.json") && (any(dir(paste(path,batch,sep="/")) == "users.json")) ) {
    batchData = read_json(paste(path,batch,"batch.json",sep="/"), simplifyVector = TRUE)
    return(any(batchData$batchComplete == TRUE))
  } 
  return(FALSE)
}, batches)

userFiles = lapply(completeBatches, function(batch){
  userFile = read_json(paste(path,batch,"users.json",sep="/"), simplifyVector = TRUE)
  return(flatten(userFile, recursive = TRUE))
})

class(userFiles)
userFiles

Reduce(rbind,userFiles)


moreBatches = Filter(function(batch) {
  read_json(paste(path,batch,"batch.json",sep="/"))
}, batchesWithBatch)

files = dir(path, pattern = "users.json")
data = files %>%
  map_df(~fromJSON(file.path(path, .), flatten = TRUE))
