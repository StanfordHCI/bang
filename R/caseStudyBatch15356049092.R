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


## to-do: *FIGURE OUT A BETTER WAY TO MERGE: THIS IS PURE JIBBERISH // WORST CODING EVER, BUT R SUCKS* 

## Subset batch #1, complete observations for case study: 
data <- frame[frame$batch==1534356049092, ] 
data <- data[data$blacklist!="", ]
data2 <- finalRounds[finalRounds$batch==1534356049092, ]
data2 <- data2[data2$results.blacklistCheck!="", ]
data2 = data2 %>% select(id, mturkId, assignmentId, batch, room, bonus, name, friends, 
                              friends_history, results.condition, results.format,
                              results.manipulation,results.manipulationCheck, results.blacklistCheck, round)
data2$id <- unlist(data2$id)
data2$round <- unlist(data$round)
data2$batch <- unlist(data$batch)
data <- right_join(data, data2, by=NULL)

## new columns for masked vs. unmasked data:  
data <- data %>% mutate(condition = case_when(round == 1 ~ "unmasked",
                                               round == 3  ~ "masked",
                                              round == 2 ~ "control"))

## for testing 
# if (treatment==c(1,2,1)) {mutate(condition = case_when(round == 1 ~ "unmasked",
#                                                       round == 2  ~ "control",
#                                                       round == 3 ~ "masked"))
# } else if (treatment==c(2,1,1)) {mutate(condition = case_when(round == 1 ~ "control",
#                                                               round == 2  ~ "unmasked",
#                                                               round == 3 ~ "masked"))
# } else if (treatment==c(1,1,2)) {mutate(condition = case_when(round == 1 ~ "unmasked",
#                                                                 round == 2  ~ "masked",
#                                                                 round == 3 ~ "control"))
# } 

## extract observations only for unmasked & masked conditions: 

## Set-up factors / levels: 

data <- rename(data, "repeatTeam" = results.viabilityCheck.15)
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

## Likert graph for all viability responses from all rounds: control + masked + unmasked round: 
likert.out <- likert(viabilityLikert[-c(15)]) 
plot(likert.out)

## Unmasked viability: 
unMaskedViability <- subset(viabilityLikert, condition=="unmasked") 
likert.unMasked <- likert(unMaskedViability[-c(15)])
plot(likert.unMasked)
plot(likert.unMasked,	type='density')

## Round 2 / control viability: 
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

maskedStats <- subset(stats, condition=="masked")
for (i in 1:nrow(maskedStats)) {
  maskedStats$sum[i] <- sum(maskedStats[i,1:14])                          
} 
maskedStats$mean <- mean(maskedStats$sum) 

controlStats <- subset(stats, condition=="control")
for (i in 1:nrow(controlStats)) {
  controlStats$sum[i] <- sum(controlStats[i,1:14])                          
} 
controlStats$mean <- mean(controlStats$sum) 

barfill <- "#4271AE"
barlines <- "#1F3552"
## Mean for unmasked: 43 
meanViabilityDistributionUnMasked <- ggplot(unMaskedStats, aes(x = sum)) +
  geom_histogram(aes(y = ..count..), binwidth = 5,
                 colour = barlines, fill = barfill) +
  scale_x_continuous(name = "Mean viability sum \n across all teams in unmasked round",
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
  geom_vline(xintercept = 43, size = 1, colour = "#FF3721",
             linetype = "dashed")
meanViabilityDistributionUnMasked 


## Mean for control: 66.33  

meanViabilityDistributionUnMasked <- ggplot(unMaskedStats, aes(x = sum)) +
  geom_histogram(aes(y = ..count..), binwidth = 5,
                 colour = barlines, fill = barfill) +
  scale_x_continuous(name = "Mean viability sum \n across all teams in unmasked round",
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
  geom_vline(xintercept = 43, size = 1, colour = "#FF3721",
             linetype = "dashed")
meanViabilityDistributionUnMasked 



## Mean distribution for masked team: 

## Mean for masked: 54.33 
barfill <- "#4271AE"
barlines <- "#1F3552"
meanViabilityDistributionMasked <- ggplot(maskedStats, aes(x = sum)) +
  geom_histogram(aes(y = ..count..), binwidth = 5,
                 colour = barlines, fill = barfill) +
  scale_x_continuous(name = "Mean viability sum \n across all teams in masked round",
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
  geom_vline(xintercept = 54.33, size = 1, colour = "#FF3721",
             linetype = "dashed")
meanViabilityDistributionMasked

## Boxplot distribution of sums in conditions for 

## unmasked condition + repeat team question 

g <- ggplot(unMaskedStats, aes(factor(repeatTeam, labels=("No")), sum))
g + geom_boxplot(varwidth=T, fill="plum") + 
  labs(subtitle="Sum of viability measures grouped by repeat team question in unmasked condition", 
       x="If you had the choice, would you like to work with the same team in a future round? ",
       y="Numeric sum of viability measures questions (range: 14-98)")

## masked condition + repeat team question 

g <- ggplot(maskedStats, aes(factor(repeatTeam), sum))
g + geom_boxplot(varwidth=T, fill="plum") + 
  labs(subtitle="Sum of viability measures grouped by repeat team question in masked condition", 
       x="If you had the choice, would you like to work with the same team in a future round? ",
       y="Numeric sum of viability measures questions (range: 14-98)")


## conrol condition  + repeat team question 

g <- ggplot(controlStats, aes(factor(results.viabilityCheck.15), sum))
g + geom_boxplot(varwidth=T, fill="plum") + 
  labs(subtitle="Sum of viability measures grouped by repeat team question in control condition", 
       x="If you had the choice, would you like to work with the same team in a future round? ",
       y="Numeric sum of viability measures questions (range: 14-98)")

## masked + unmasked conditions factored: 

g <- ggplot(stats, aes(factor(condition), sum))
g + geom_boxplot(varwidth=T, fill="plum") + 
  labs(subtitle="Sum of viability measures grouped by condition", 
       x="Sum of viability measures grouped by condition", 
       y="Numeric sum of viability measures questions (range: 14-98)")


g <- ggplot(data, aes(x=condition, fill=condition))
g + geom_bar() + facet_grid(.~repeatTeam) + 
  theme(
    axis.text.x=element_blank(),
    axis.ticks.x=element_blank()) + 
  xlab(label="If you had the choice, would you like to work with the same team in a future round?") + 
  ylab(label="Count of repeat team answers") + 
  labs(title="Distribution of repeat team question overlayed by condition", fill = "Condition")

## Basic exploratory stats testing: 

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


## How to compare individual: 

## facet_grid sums from masked vs. unmasked based on id? (rename id as individual) 











