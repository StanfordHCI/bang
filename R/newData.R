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
  roomsForIndividual = lapply(seq(1,3),function(y) {
    x$room = x$rooms[y]
    x$round = y
    return(x)
  })
  return(Reduce(rbind,roomsForIndividual))
})

frame <- extractSurvey(overlappingFiles, survey)
finalRounds = as.data.frame(Reduce(rbind,roundsWithRooms))

## to-do: *FIGURE OUT A BETTER WAY TO MERGE: THIS IS PURE JIBBERISH // WORST CODING EVER, BUT R SUCKS* 


## Is there a better way we can subset out complete observations then using blacklist? 
data <- frame[frame$blacklist!="",]
data <- dplyr::rename(data, "rooms" = rooms)
data2 <- finalRounds[finalRounds$results.blacklistCheck!="", ]
data2 = data2 %>% select(id, batch, room, bonus, name, friends, 
                         friends_history, results.condition, results.format,
                         results.manipulation,results.manipulationCheck,results.blacklistCheck, round)

## Convert to compatible data type before merge (to-do: clean up)
data2$id <- unlist(data2$id)
data$round <- unlist(data$round)
data2$batch <- unlist(data2$batch)
data$batch <- unlist(data$batch)
data2$round <- unlist(data2$round)
data <- left_join(data, data2, by=NULL)
allConditions <- data[data$batch %in% completeBatches, ]

## Subset complete batches only 

## Create new columns for 
data <- allConditions %>% filter(results.condition=="treatment") %>% mutate(condition = case_when(round == 1 ~ "baseline",
                                                                                                  round == 2  ~ "control",
                                                                                                  round == 3 ~ "experiment"))

## Conditional for reading and assigning conditions: 


data3 <- for (i in 1:nrow(data)) { 
  if (data$results.format[i]==x) {mutate(data, condition2 = case_when(round == 1 ~ "test",
                                                                      round == 2  ~ "control",
                                                                      round == 3 ~ "masked"))
  }} 


data3 <- for (i in 1:nrow(data)) { 
  if (data$results.format[i]==x) { mutate(data, condition2[i] = case_when(round == 1 ~ "does this work",
                                                                          round == 2  ~ "control",
                                                                          round == 3 ~ "masked"))
  }} 

# 
#  else if (data$results.format==c(2,1,1)) {mutate(data, condition = case_when(round == 1 ~ "control",
#                                                            round == 2  ~ "unmasked",
#                                                           round == 3 ~ "masked"))
# } else if (data$results.format==c(1,1,2)) {mutate(data, condition = case_when(round == 1 ~ "unmasked",
#                                                               round == 2  ~ "masked",
#                                                                round == 3 ~ "control")) 
#   
#  } 

## Extract observations only for unmasked and masked conditions: 

## Set-up factors / levels: 

data <- dplyr::rename(data, "repeatTeam" = results.viabilityCheck.15)
data <- na.omit(data)
levels <- c("Strongly Disagree", "Disagree", "Neutral","Agree", "Strongly Agree") 
levels2 <- c("1","2","3")
clean <- data %>% 
  mutate_at(.vars = vars(contains("results.viabilityCheck")), funs(factor(., levels = levels))) %>%
  mutate_at(.vars = vars(contains("blacklist")), funs(factor(., levels = levels2))) %>% 
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

## Likert graph for all viability responses from all rounds: control + masked + unmasked round: 
likert.out <- likert(viabilityLikert[-c(15)]) 
plot(likert.out)

## Unmasked viability: 
unMaskedViability <- subset(viabilityLikert, condition=="unmasked") 
likert.unMasked <- likert(unMaskedViability[-c(15)])
plot(likert.unMasked)
plot(likert.unMasked,	type='density')

## Round 2 // control viability: 
controlViability <- subset(viabilityLikert, condition=="control") 
likert.control <- likert(controlViability[-c(15)])
plot(likert.control)
plot(likert.control,	type='density')

## Masked viability: 
maskedViability <- subset(viabilityLikert, condition=="masked") 
likert.Masked <- likert(maskedViability[-c(15)])
plot(likert.Masked)
plot(likert.Masked,	type='density')


## New data frame to numeric for stats tests: 
stats <- clean %>% mutate_if(is.factor, as.numeric)
for (i in 1:nrow(stats)) {
  stats$sum[i] <- sum(stats[i,1:14])                          
} 

## Mean viability sum distribution graph: 
unMaskedStats <- subset(stats, condition=="unmasked") 
for (i in 1:nrow(unMaskedStats)) {
  unMaskedStats$sum[i] <- sum(unMaskedStats[i,1:14])                          
} 
unMaskedStats$mean <- mean(unMaskedStats$sum) 
unMaskedStats$median <- median(unMaskedStats$sum)

maskedStats <- subset(stats, condition=="masked")
for (i in 1:nrow(maskedStats)) {
  maskedStats$sum[i] <- sum(maskedStats[i,1:14])                          
} 
maskedStats$mean <- mean(maskedStats$sum) 
maskedStats$median <- median(maskedStats$sum)

controlStats <- subset(stats, condition=="control")
for (i in 1:nrow(controlStats)) {
  controlStats$sum[i] <- sum(controlStats[i,1:14])                          
} 
controlStats$mean <- mean(controlStats$sum) 
controlStats$median <- median(controlStats$sum)

## mean / median plot: 

plot(stats$mean, stats$median)

## Mean viability distribution graph: unmasked condition
barfill <- "#4271AE"
barlines <- "#1F3552"
## Mean for unmasked: (##fill-in: 49.875 )
meanViabilityDistributionUnMasked <- ggplot(unMaskedStats, aes(x = sum)) +
  geom_histogram(aes(y = ..count..), binwidth = 5,
                 colour = barlines, fill = barfill) +
  scale_x_continuous(name = "Median viability sum \n across all teams in unmasked round",
                     breaks = seq(0, 100, 20),
                     limits=c(14, 98)) +
  scale_y_continuous(name = "count") +
  ggtitle("Frequency of sum of viability scores: unmasked condition, N=9") +
  theme_bw() +
  theme(axis.line = element_line(size=1, colour = "black"),
        panel.grid.major = element_line(colour = "#d3d3d3"),
        panel.grid.minor = element_blank(),
        panel.border = element_blank(), panel.background = element_blank(),
        plot.title = element_text(size = 14, family = "Tahoma", face = "bold"),
        text=element_text(family="Tahoma"),
        axis.text.x=element_text(colour="black", size = 9),
        axis.text.y=element_text(colour="black", size = 9)) +
  geom_vline(xintercept = 55.5, size = 1, colour = "#FF3721",
             linetype = "dashed")
meanViabilityDistributionUnMasked 

## Mean viability distribution graph: control
## Mean for control: (fill-in)
meanViabilityDistributionControl <- ggplot(controlStats, aes(x = sum)) +
  geom_histogram(aes(y = ..count..), binwidth = 5,
                 colour = barlines, fill = barfill) +
  scale_x_continuous(name = "Median viability sum \n across all teams in control round",
                     breaks = seq(0, 100, 20),
                     limits=c(14, 98)) +
  scale_y_continuous(name = "count") +
  ggtitle("Frequency of sum of viability scores: control condition, N=9") +
  theme_bw() +
  theme(axis.line = element_line(size=1, colour = "black"),
        panel.grid.major = element_line(colour = "#d3d3d3"),
        panel.grid.minor = element_blank(),
        panel.border = element_blank(), panel.background = element_blank(),
        plot.title = element_text(size = 14, family = "Tahoma", face = "bold"),
        text=element_text(family="Tahoma"),
        axis.text.x=element_text(colour="black", size = 9),
        axis.text.y=element_text(colour="black", size = 9)) +
  geom_vline(xintercept = 56, size = 1, colour = "#FF3721",
             linetype = "dashed")
meanViabilityDistributionControl

## Mean viability distribution graph: masked 
## Mean for masked: (fill-in)
barfill <- "#4271AE"
barlines <- "#1F3552"
meanViabilityDistributionMasked <- ggplot(maskedStats, aes(x = sum)) +
  geom_histogram(aes(y = ..count..), binwidth = 5,
                 colour = barlines, fill = barfill) +
  scale_x_continuous(name = "Median viability sum \n across all teams in masked round",
                     breaks = seq(0, 98, 14),
                     limits=c(14, 98)) +
  scale_y_continuous(name = "count") +
  ggtitle("Frequency of sum of viability scores: masked condition, N=9") +
  theme_bw() +
  theme(axis.line = element_line(size=1, colour = "black"),
        panel.grid.major = element_line(colour = "#d3d3d3"),
        panel.grid.minor = element_blank(),
        panel.border = element_blank(), panel.background = element_blank(),
        plot.title = element_text(size = 14, family = "Tahoma", face = "bold"),
        text=element_text(family="Tahoma"),
        axis.text.x=element_text(colour="black", size = 9),
        axis.text.y=element_text(colour="black", size = 9)) +
  geom_vline(xintercept = 59, size = 1, colour = "#FF3721",
             linetype = "dashed") 
meanViabilityDistributionMasked


## Boxplot distribution of viability scale sums: 

## unmasked condition + repeat team question 

g <- ggplot(unMaskedStats, aes(factor(repeatTeam, labels = c("Yes", "No")), sum))
g + geom_boxplot(varwidth=T, fill="plum") + 
  labs(subtitle="Sum of viability measures grouped by repeat team question in unmasked condition", 
       x="If you had the choice, would you like to work with the same team in a future round? ",
       y="Numeric sum of viability measures questions (range: 14-98)")

g <- ggplot(unMaskedStats, aes(factor(repeatTeam, labels = c("Yes", "No")), sum))
g + geom_boxplot(varwidth=T, fill="plum") + 
  labs(subtitle="Sum of viability measures grouped by repeat team question in unmasked condition", 
       x="If you had the choice, would you like to work with the same team in a future round? ",
       y="Numeric sum of viability measures questions (range: 14-98)")

## masked condition + repeat team question 

g <- ggplot(maskedStats, aes(factor(repeatTeam, labels = c("Yes", "No")), sum))
g + geom_boxplot(varwidth=T, fill="plum") + 
  labs(subtitle="Sum of viability measures grouped by repeat team question in masked condition", 
       x="If you had the choice, would you like to work with the same team in a future round? ",
       y="Numeric sum of viability measures questions (range: 14-98)")

## conrol condition  + repeat team question 

g <- ggplot(controlStats, aes(factor(repeatTeam, labels = c("Yes", "No")), sum))
g + geom_boxplot(varwidth=T, fill="plum") + 
  labs(subtitle="Sum of viability measures grouped by repeat team question in control condition", 
       x="If you had the choice, would you like to work with the same team in a future round? ",
       y="Numeric sum of viability measures questions (range: 14-98)")

stats$room <- unlist(stats$room)
g <- ggplot(blacklist, aes(factor(team), mean))
g + geom_bar(varwidth=T, fill="plum")  + 
  labs(subtitle="Sum of viability measures grouped by condition", 
       x="Sum of viability measures grouped by condition", 
       y="Numeric sum of viability measures questions (range: 14-98)")

g <- ggplot(blacklist, aes(x=team, fill=factor(team), y=mean))
g + geom_bar(stat="identity") + facet_grid(.~blacklist) + 
  theme(
    axis.text.x=element_blank(),
    axis.ticks.x=element_blank()) + 
  xlab(label="") + 
  ylab(label="Mean viability results") + 
  labs(title="Mean viability grouped by team and blacklist", fill = "Teams")

g <- ggplot(stats, aes(x=blacklist, fill=factor(blacklist, mean))) + 
  g + geom_bar() + facet_grid(.~repeatTeam) + 
  theme(
    axis.text.x=element_blank(),
    axis.ticks.x=element_blank()) + 
  xlab(label="If you had the choice, would you like to work with the same team in a future round?") + 
  ylab(label="Count of blacklist choices") + 
  labs(title="Distribution of repeat team question overlayed by blacklist response", fill = "Blacklist")

## Proportion graphs for Q15: 

stats$repeatTeam <- plyr::revalue(stats$repeatTeam, c("Yes"="1", "No"="0"))
stats$repeatTeam <- as.numeric(stats$repeatTeam)
stats$room <- unlist(stats$room) 

groupedProportion<- stats %>%
  group_by(round, room, batch) %>% 
  summarise(n=n()) %>% 
  mutate(sum=sum(repeatTeam)/n) %>% 
  filter(n>1) 

individualProportion <- stats %>% group_by(round, batch, room) %>% 
  mutate(sum=sum, mean=mean(sum), median=median(sum), n=n(),prop=sum(repeatTeam)/n) %>% filter(n>1)

ggplot(data=groupedProportion, aes(groupedProportion$freq)) + 
  geom_histogram(breaks=seq(0, 1, by=0.20), 
                 col="red", 
                 fill="green", 
                 alpha=.2) + labs(title="Binary proportion of answers for question 15 per team (team size range: 2-4) N=49 teams", 
                                  x="If you had the choice, would you like to work with the same team in a future round? 
                                  1=Yes , 0=No", y="Count") 

ggplot(data=individualProportion, aes(individualProportion$prop)) + 
  geom_histogram(breaks=seq(0, 1, by=0.20), 
                 col="red", 
                 fill="green", 
                 alpha=.2) + labs(title="Binary proportion of answers for question 15 per team (team size range: 2-4) N=127 observations",
                                  x="If you had the choice, would you like to work with the same team in a future round? 
                                  1=Yes , 0=No", y="Count") 

qplot(sum, median, data=proportion, 
      main="Scatterplots median vs. mean for viability sum responses per team",
      xlab="mean", ylab="median")

fit1 <- lm(sum ~ prop, data = proportionQ15)
summary(fit1)
plot(sum ~ prop, data = proportionQ15)
abline(fit1)

qplot(prop, sum, data=Q15, 
      main="Scatterplot of proportions for repeat team and viability sum responses per team",
      xlab="Repeat team question proportion", ylab="viability sums") + 
  geom_smooth(method='lm',se=TRUE)

ggplot(data=proportion, aes(proportion$freq)) + 
  geom_histogram(breaks=seq(0, 1, by=0.1), 
                 col="red", 
                 fill="green", 
                 alpha=.2) + labs(title="Binary proportion of answers for question 15 per team (team size range: 2-4) N=49 teams", 
                                  x="If you had the choice, would you like to work with the same team in a future round? 
                                  1=Yes , 2=no", y="Count") 

ggplot(data=proportion, aes(proportion$freq)) + 
  geom_histogram(breaks=seq(0, 1, by=0.05), 
                 col="red", 
                 fill="green", 
                 alpha=.2) + labs(title="Binary proportion of answers for question 15 per team (team size range: 2-4) N=49 teams", 
                                  x="If you had the choice, would you like to work with the same team in a future round? 
                                  1=Yes , 2=no", y="Count") 

## Proability / proportion table: 

## Group by then: 

prop.table(m, 1)
prop.table(table(df))

## Basic exploratory stats testing: 
## Parametric inference: 
hist(stats$sum,xlab="Sum of scores",main="")

## Depending on the results from this test, we can determine if we are justified in using a parametric test. 
## If, data passes normality tests, then we can use the following tests: 
## T-Test. We can use a two-sample T-test to asses if there is a difference in the scores of specific groups:
## Examples: 
## First use a boxplot for visualization to identify a relationship. 

## If normality assumptions are met: 
## Is there a significant difference between viability sums between conditions: masked // unmasked? 

pairedTest <-  subset(stats, condition=="masked" | condition=="unmasked") 
t.test(sum~condition, data=pairedTest)

## How to compare individual:

## facet_grid sums from masked vs. unmasked based on id? (rename id as individual) 

g <- ggplot(stats, aes(factor(condition), sum))
g + geom_boxplot(varwidth=T, fill="plum") + facet_grid(.~mturkId)
labs(subtitle="Sum of viability measures grouped by condition", 
     x="Sum of viability measures grouped by condition", 
     y="Numeric sum of viability measures questions (range: 14-98)")

blacklist$blacklist <- unlist(blacklist$blacklist)

g <- ggplot(blacklist, aes(factor(team), mean, fill=blacklist)) 
g + geom_boxplot(varwidth=T, fill="plum") +
  labs(subtitle="Sum of viability measures grouped by condition", 
       x="Sum of viability measures grouped by condition", 
       y="Numeric sum of viability measures questions (range: 14-98)") 

## Analyze data from control and basline conditions: 

## subset data for baseline 

baselineData %>% data %>% filter(condition=="basline")

## subset data for control

controlData <- data %>% filter(results.condition=="control")

## Chat data import: 

chatFiles = lapply(completeBatches, function(batch){
  chatFile = read_json(paste(dataPath,batch,"chats.json",sep="/"), simplifyVector = TRUE)
  return(flatten(chatFile, recursive = TRUE))
})

allChatFiles <- ldply(chatFiles, data.frame)

chatFreq <- allChatFiles  %>%
  group_by(round, room, batch) %>% 
  dplyr::summarise(n=n()) %>% 
  filter(n>0)

library(ggplot2)
theme_set(theme_classic())
# Histogram grouped by round: 
g <- ggplot(chatFreq, aes(n)) + scale_fill_brewer(palette = "Spectral")
g + geom_histogram(aes(fill=factor(round)), 
                   bins=5, 
                   col="black", 
                   size=.1) +   # change number of bins
  labs(title="Histogram of chat line length per team (includes teams with n=1)", 
  fill = "Round") + 
  xlab(label="Number of lines from chat data per team") + 
  ylab(label="Count") 

stats$room <- unlist(stats$room) 
chatFreqStats <- right_join(x=chatFreq, y=stats)

# Histogram grouped by round: 
g <- ggplot(chatFreq, aes(n)) + scale_fill_brewer(palette = "Spectral")
g + geom_histogram(aes(fill=factor(round)), 
                   bins=5, 
                   col="black", 
                   size=.1) +   # change number of bins
  labs(title="Histogram of chat line length per team (includes teams with n=1)", 
       fill = "Round") + 
  xlab(label="Number of lines from chat data per team") + 
  ylab(label="Count") 

stats$repeatTeam <- revalue(stats$repeatTeam, c("Yes"="1", "No"="0"))









