## Case study: batch: 1534356049092

## Set-up and import: 

rm(list=ls())
setwd("/Users/allieblaising/desktop/bang/R") 
getwd()
dataPath = "../.data"

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
    surveyFrame$batch = frame$batch
    surveyFrame$rooms = frame$rooms
    surveyFrame$blacklist = frame$results.blacklistCheck
    return(surveyFrame)
  })
  return(Reduce(rbind,roundResponses))
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

userFiles = lapply(completeBatches, function(batch) {
  userFile = read_json(paste(dataPath,batch,"users.json",sep="/"), simplifyVector = TRUE)
  return(flatten(userFile, recursive = TRUE))
})

overlappingFiles = Reduce(function(x,y) merge(x, y, all=TRUE), userFiles)
roundsWithRooms = apply(overlappingFiles,1,function(x) {
  roomsForIndividual = lapply(seq(1,length(x$rooms)),function(y) {
    x$room = x$rooms[y]
    x$round = y
    if (x$room=="") { 
      x$room=x$rooms[2]
    }
    return(x)
  })
  return(Reduce(rbind,roomsForIndividual))
})

frame <- extractSurvey(overlappingFiles, survey)
finalRounds = as.data.frame(Reduce(rbind,roundsWithRooms))
finalRounds$id <- unlist(finalRounds$id)

## to-do: *FIGURE OUT A WAY TO MERGE*

data = finalRounds %>% select(id, mturkId, assignmentId, batch, room, rooms, bonus, name, friends, 
                             friends_history, results.condition, results.format,
                             results.manipulation,results.manipulationCheck, results.blacklistCheck, round)

data <- rename(data, "repeatTeam" = results.viabilityCheck.15)
data <- data[data$batch==1534356049092, ] 
data <- data[data$blacklist!="", ]

## new columns for masked vs. unmasked data:  
data <- data %>% mutate(condition=(round==1)) %>% mutate(masked=(round==3))
data <- data %>% mutate(condition = case_when(round == 1 ~ "unmasked",
                                               round == 3  ~ "masked"
                                                round == 2 ~ "control"))
data <- data[data$condition=="unmasked" | data$condition=="masked",]

## Subset batch #1, complete observations for case study: 
data <- data[data$batch==1534356049092, ] 
data <- data[data$blacklist!="", ]

## Set-up factors / levels: 
levels <- c("Strongly Disagree", "Disagree", "Neutral","Agree", "Strongly Agree") 
levels2 <- c("1","2","3")
levels3 <- c("Yes", "No")
clean <- data %>% 
  mutate_at(.vars = vars(contains("results.viabilityCheck")), funs(factor(., levels = levels))) %>%
  mutate_at(.vars = vars(contains("results.blacklistCheck")), funs(factor(., levels = levels2))) %>% 
  mutate_at(.vars = vars(contains("repeatTeam")), funs(factor(., levels=levels3))) 

## Viabilitylikert visuals: 
viabilityLikert <- select(clean, contains("results.viabilityCheck"), "condition")
viabilityLabels = c("1. The members of this team could work for a long time together" 
                    , "2. Most of the members of this team would welcome the opportunity to work as a group again in the future." , 
                    "3. This team has the capacity for long-term success.", 
                    "4. This team has what it takes to be effective in the future.", 
                    "5. This team would work well together in the future." , 
                    " 6. This team has positioned itself well for continued success.",  
                    " 7. This team has the ability to perform well in the future. ", 
                    " 8. This team has the ability to function as an ongoing unit." , 
                    " 9. This team should continue to function as a unit. ", 
                    " 10. This team has the resources to perform well in the future. ", 
                    " 11. This team is well positioned for growth over time. ", 
                    " 12. This team can develop to meet future challenges. ", 
                    " 13. This team has the capacity to sustain itself. ", 
                    " 14. This team has what it takes to endure in future performance episodes.", "condition") 
names(viabilityLikert) <- rep(viabilityLabels) 

## Likert graph for all viability responses from both masked + unmasked round: 
likert.out <- likert(viabilityLikert[-15]) 
plot(likert.out)

## Unmasked viability: 
unMaskedViability <- subset(viabilityLikert, condition=="masked") 
likert.unMasked <- likert(unMaskedViability[-c(14:16)])
plot(likert.unMasked)
plot(likert.unMasked,	type='density')

## Masked viability: 
maskedViability <- subset(viabilityLikert, round==3)
likert.Masked <- likert(maskedViability)
plot(likert.masked)
plot(likert.masked,	type='density')

## New data frame to numeric for stats tests: 
stats <- clean %>% mutate_if(is.factor, as.numeric)

## Mean viability sum distribution graph: 

unMaskedStats <- subset(stats, condition=="unmasked") 
for (i in 1:nrow(unMaskedStats)) {
  unMaskedStats$sum[i] <- sum(unMaskedStats[i,10:23])                          
} 
unMaskedStats$mean <- unMaskedmean(unMaskedStats$sum) 

maskedStats <- subset(stats, condition=="masked")
for (i in 1:nrow(maskedStats)) {
  maskedStats$sum[i] <- sum(maskedStats[i,10:23])                          
} 
maskedStats$mean <- maskedmean(maskedStats$sum) 

barfill <- "#4271AE"
barlines <- "#1F3552"
meanViabilitySumUnMasked <- ggplot(unMaskedStats, aes(x = sum)) +
  geom_histogram(aes(y = ..count..), binwidth = 5,
                 colour = barlines, fill = barfill) +
  scale_x_continuous(name = "Mean viability sum \n across all teams in *unmasked* round",
                     breaks = seq(0, 98, 14),
                     limits=c(14, 98)) +
  scale_y_continuous(name = "count") +
  ggtitle("Frequency of sum of viability scores: N=9") +
  theme_bw() +
  theme(axis.line = element_line(size=1, colour = "black"),
        panel.grid.major = element_line(colour = "#d3d3d3"),
        panel.grid.minor = element_blank(),
        panel.border = element_blank(), panel.background = element_blank(),
        plot.title = element_text(size = 14, family = "Tahoma", face = "bold"),
        text=element_text(family="Tahoma"),
        axis.text.x=element_text(colour="black", size = 9),
        axis.text.y=element_text(colour="black", size = 9)) +
  geom_vline(xintercept = 57.65, size = 1, colour = "#FF3721",
             linetype = "dashed")
meanViabilityDistributionUnMasked 

## Mean distribution for masked team: 

barfill <- "#4271AE"
barlines <- "#1F3552"
meanViabilityDistributionUnMasked <- ggplot(maskedStats, aes(x = sum)) +
  geom_histogram(aes(y = ..count..), binwidth = 5,
                 colour = barlines, fill = barfill) +
  scale_x_continuous(name = "Mean viability sum \n across all teams in masked round",
                     breaks = seq(0, 98, 14),
                     limits=c(14, 98)) +
  scale_y_continuous(name = "count") +
  ggtitle("Frequency of sum of viability scores: N=9") +
  theme_bw() +
  theme(axis.line = element_line(size=1, colour = "black"),
        panel.grid.major = element_line(colour = "#d3d3d3"),
        panel.grid.minor = element_blank(),
        panel.border = element_blank(), panel.background = element_blank(),
        plot.title = element_text(size = 14, family = "Tahoma", face = "bold"),
        text=element_text(family="Tahoma"),
        axis.text.x=element_text(colour="black", size = 9),
        axis.text.y=element_text(colour="black", size = 9)) +
  geom_vline(xintercept = 57.65, size = 1, colour = "#FF3721",
             linetype = "dashed")

meanViabilityDistributionMasked
unMaskedStats <- subset(stats, condition=="masked") 
maskedStats <- subset(stats, condition=="unmasked")

## Boxplot distribution of sums in conditions for 

g <- ggplot(stats, aes(factor(condition, labels = c("Yes", "No")), sum))
g + geom_boxplot(varwidth=T, fill="plum") + 
  labs(subtitle="Sum of viability measures grouped by repeat team question; N = 2 complete", 
       x="If you had the choice, would you like to work with the same team in a future round? ",
       y="Numeric sum of viability measures questions (range: 14-98)")

## basic exploratory stats testing: 

## Parametric inference: 

hist(stats$sum,xlab="Sum of scores",main="")

## Depending on the results from this test, we can determine if we are justified in using a parametric test. 

## If, data passes normality tests, then we can use the following tests: 
## T-Test. We can use a two-sample T-test to asses if there is a difference in the scores of specific groups:
## Examples: 
## First use a boxplot for visualization to identify a relationship. 

## If normality assumptions are met: 

merge(unMaskedStats, maskedStats, by=NULL)

t.test(stats$maskedSum, 
       stats$unmaskedSum, 
       paired=TRUE, 
       conf.level=0.95)

## Is there a significant difference between viability sums between conditions: masked // unmasked? 

t.test(sum~condition, data=stats)











