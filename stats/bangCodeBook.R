## Set-up libraries and prepare for data import: 
library(psych)
library(likert)
library(tidyverse)
library(jsonlite)
library(ggplot2)
theme_set(theme_classic())

## WARNING: make sure that plyr is detached before running dplyr stuff, other you're going to sit at your computer 
## banging your head like I did, so....[detach(package:plyr) library(dplyr)]

rm(list=ls())
## Change working directory: 
setwd("/Users/allieblaising/desktop/bang/R") 
getwd()
dataPath = "../.data"

## Define function to extract survey results: 
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

#Find directory for import (be sure to verify that batch #s align from bangData import and imports below): 
batches = dir(dataPath, pattern = "^[0-9]+$" )
completeBatches = Filter(function(batch) { 
  if (any(dir(paste(dataPath,batch,sep="/")) == "batch.json") && (any(dir(paste(dataPath,batch,sep="/")) == "users.json")) ) {
    batchData = read_json(paste(dataPath,batch,"batch.json",sep="/"), simplifyVector = TRUE)
    return(any(batchData$batchComplete == TRUE))
  } 
  return(FALSE)
}, batches)

userFiles = lapply(completeBatches, function(batch) {
  userFile = fromJSON(paste(dataPath,batch,"users.json",sep="/"), flatten = TRUE) 
  return(flatten(userFile, recursive = TRUE)) 
})

ggplot(fracture, aes(prop, prop1)) +
  geom_point() +
  geom_jitter() + coord_fixed() + xlim(0.0,1.0) + ylim(0.0,1.0) + labs(title="Team fracture in the first round vs. fracture in the experimental round", subtitle="Fracture scale 0=no fracture, 1=fracture",  
                                                                       x="Fracture the first time a team interacts", 
                                                                       y="Fracture the second time a team interacts, without knowing it") 

## Retroactively find rooms from chat data: 
overlappingFiles = Reduce(function(x,y) merge(x, y, all=TRUE), userFiles)
roundsWithRooms = apply(overlappingFiles,1,function(x) {
  roomsForIndividual = lapply(seq(1,3),function(y) {
    x$room = x$rooms[y]
    x$round = y
    return(x)
  })
  return(Reduce(rbind,roomsForIndividual))
})

ggplot(controlFracture, aes(prop, prop1)) +
  geom_point() +
  geom_jitter() + coord_fixed() + xlim(0.0,1.0) + ylim(0.0,1.0) + labs(title="Team fracture in the first round vs. fracture in the second control round", subtitle="Fracture scale 0=no fracture, 1=fracture",  
                                                                       x="Fracture the first time a team interacts", 
                                                                       y="Fracture the second time a team interacts, without knowing it") 


## Apply extract survey function to extract the right columns and rows for viability survey: 
survey = 'viabilityCheck'
frame <- extractSurvey(overlappingFiles, survey)
## Reduce to vertically combine rows in roundwithRooms list:  
finalRounds = as.data.frame(Reduce(rbind,roundsWithRooms))

## Subset incomplete cases from viability survey dataframe: 
## MSB: complete.cases doesn't work when there aren't NAs, but empty lists, alternatives rather than subsetting where 
## blacklist is empty? Doens't work: test <- complete.cases(data)
data <- frame[frame$blacklist!="",]
## Rename room to rooms so that both are retained in future merge: 
data <- rename(data, rooms = "room")

## Subset incomplete cases for final rounds dataframe: 
data2 <- finalRounds[finalRounds$results.blacklistCheck!="", ]

## Select only variables of interest from final rounds: 
data2 = data2 %>% select(id, batch, room, bonus, name, friends, 
                         friends_history, results.condition, results.format,
                         results.manipulation,results.manipulationCheck,results.blacklistCheck, round)

## Convert to compatible data types before merge (this should be simplified)
data$round <- unlist(data$round)
data2$batch <- unlist(data2$batch)
data$batch <- unlist(data$batch)
data2$round <- unlist(data2$round)
data2$id <- unlist(data2$id)
## Before merge, data and data2 should ahve the same # of observations
## Merge columns by id, round and batch #s: 
data <- left_join(data, data2, by=NULL)
## Subset only observations with batch #s in complete batches 
allConditions <- data[data$batch %in% completeBatches, ]

## Conditionally assign conditions based on treatment and results column: 

##MSB: below works, but massive and precarious. Ideas for setting up conditional data table to read it? 

## For format to be read in properly, we need to make format a character vector: 
data$results.format <- as.character(data$results.format)

## If we keep this // MSB can't come up with a better approach, we need like everyone to triple check this matches with our 
## code book. 

data <- data %>% mutate(
  condition = case_when(
    results.condition=='treatment' & results.format=="c(1, 2, 1)" & round==1 ~ "A", 
    results.condition=='treatment' & results.format=="c(1, 2, 1)" & round==2 ~ "B", 
    results.condition=='treatment' & results.format=="c(1, 2, 1)" & round==3 ~ "Ap", 
    results.condition=='treatment' & results.format=="c(1, 1, 2)" & round==1 ~ "A", 
    results.condition=='treatment' & results.format=="c(1, 1, 2)" & round==2 ~ "Ap", 
    results.condition=='treatment' & results.format=="c(1, 1, 2)" & round==3 ~ "B", 
    results.condition=='treatment' & results.format=="c(2, 1, 1)" & round==1 ~ "B", 
    results.condition=='treatment' & results.format=="c(2, 1, 1)" & round==2 ~ "A", 
    results.condition=='treatment' & results.format=="c(2, 1, 1)" & round==3 ~ "Ap" ,
    results.condition=='control' & results.format=="c(1, 2, 1)" & round==1 ~ "A", 
    results.condition=='control' & results.format=="c(1, 2, 1)" & round==2 ~ "B", 
    results.condition=='control' & results.format=="c(1, 2, 1)" & round==3 ~ "A", 
    results.condition=='control' & results.format=="c(1, 1, 2)" & round==1 ~ "A", 
    results.condition=='control' & results.format=="c(1, 1, 2)" & round==2 ~ "A", 
    results.condition=='control' & results.format=="c(1, 1, 2)" & round==3 ~ "B", 
    results.condition=='control' & results.format=="c(2, 1, 1)" & round==1 ~ "B", 
    results.condition=='control' & results.format=="c(2, 1, 1)" & round==2 ~ "A", 
    results.condition=='control' & results.format=="c(2, 1, 1)" & round==3 ~ "A" , 
    results.condition=='baseline' & results.format=="c(1, 2, 3)" & round==1 ~ "A" ,
    results.condition=='baseline' & results.format=="c(1, 2, 3)" & round==2 ~ "B" ,
    results.condition=='baseline' & results.format=="c(1, 2, 3)" & round==3 ~ "C" 
  )) 

## Assign factor levels for survey and graph visualizations: 
data <- rename(data, "repeatTeam" = results.viabilityCheck.15)
## Remove observations where viability survey wasn't on: 
data <- na.omit(data)
levels <- c("Strongly Disagree", "Disagree", "Neutral","Agree", "Strongly Agree") 
clean <- data %>% 
  mutate_at(.vars = vars(contains("results.viabilityCheck")), funs(factor(., levels = levels)))  

## Viabilitylikert visuals: 
## Subset only viabilitySurvey columns and condition column (condition column used to visualize likert responses for conditions)
viabilityLikert <- select(clean, contains("results.viabilityCheck"), "condition", "results.condition")
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
                    " 14. This team has what it takes to endure in future performance episodes.", "condition", "results.condition") 
names(viabilityLikert) <- rep(viabilityLabels) 

## Likert graph for all viability responses across all conditions (i.e. baseline, control and treatment): 
likert.out <- likert(viabilityLikert[-c(15:16)]) 
plot(likert.out)

## Subset A and Ap (i.e. A prime) responses for treatment group: 
# Treatment + A: 
treatmentA <- viabilityLikert %>% filter(condition=="A" & results.condition=="treatment") 
likert.treatmentA <- likert(treatmentA[-c(15:16)])
plot(likert.treatmentA)
plot(likert.treatmentA,	type='density')

# Treatment + Ap: 
treatmentAp <- viabilityLikert %>% filter(condition=="Ap" & results.condition=="treatment") 
likert.treatmentAp <- likert(treatmentA[-c(15:16)])
plot(likert.treatmentAp)
plot(likert.treatmentAp,	type='density')

## Customize code above to filter on other conditions and treatments of interest. 

## Create a new dataframe that converts factors to numeric for statistical analyses: 
stats <- clean %>% mutate_if(is.factor, as.numeric)
for (i in 1:nrow(stats)) {
  stats$sum[i] <- sum(stats[i,1:14])                          
} 
stats$mean <- mean(stats$sum)
stats$mean <- median(stats$sum)

## Examples of how to subset visualize mean distribution for a specific condition and treatment (example case: treatment with all conditions)
treatmentAStats <- stats %>% filter(results.condition=="treatment" & condition=="A") 

for (i in 1:nrow(treatmentAStats)) {
  treatmentAStats$sum[i] <- sum(treatmentAStats[,1:14])                          
} 
treatmentAStats$mean <- mean(treatmentAStats$sum) 
treatmentAStats$median <- median(treatmentAStats$sum)

treatmentBStats <- subset(stats,results.condition=="treatment",condition=="B")
for (i in 1:nrow(treatmentBStats)) {
  treatmentBStats$sum[i] <- sum(treatmentBStats[i,1:14])                          
} 
treatmentBStats$mean <- mean(treatmentBStats$sum) 
treatmentBStats$median <- median(treatmentBStats$sum)

treatmentApStats <- subset(stats, results.condition=="treatment", condition=="Ap")
for (i in 1:nrow(treatmentApStats)) {
  treatmentApStats$sum[i] <- sum(treatmentApStats[i,1:14])                          
} 
treatmentApStats$mean <- mean(treatmentApStats$sum) 
treatmentApStats$median <- median(treatmentApStats$sum)

## Mean viability distribution graph: treatment condition, A group 
barfill <- "#4271AE"
barlines <- "#1F3552"
## Mean for treatment and A group: ##fill-in) 
meanViabilityDistributionUnMasked <- ggplot(treatmentAStats, aes(x = sum)) +
  geom_histogram(aes(y = ..count..), binwidth = 5,
                 colour = barlines, fill = barfill) +
  scale_x_continuous(name = "Median viability sum",
                     breaks = seq(0, 100, 20),
                     limits=c(0, 70)) +
  scale_y_continuous(name = "count") +
  ggtitle("Frequency of sum of viability scores: N=##fill-in") +
  theme_bw() +
  theme(axis.line = element_line(size=1, colour = "black"),
        panel.grid.major = element_line(colour = "#d3d3d3"),
        panel.grid.minor = element_blank(),
        panel.border = element_blank(), panel.background = element_blank(),
        plot.title = element_text(size = 14, family = "Tahoma", face = "bold"),
        text=element_text(family="Tahoma"),
        axis.text.x=element_text(colour="black", size = 9),
        axis.text.y=element_text(colour="black", size = 9)) +
  geom_vline(xintercept = ##fill-in, size = 1, colour = "#FF3721",
               linetype = "dashed")
meanViabilityDistributionUnMasked 

## Mean viability distribution graph: treatment condition, Aprime group 
## Mean for treatment condition, Aprime group: (fill-in)
meanViabilityDistributionControl <- ggplot(treatmentApStats, aes(x = sum)) +
  geom_histogram(aes(y = ..count..), binwidth = 5,
                 colour = barlines, fill = barfill) +
  scale_x_continuous(name = "Median viability sum",
                     breaks = seq(0, 100, 20),
                     limits=c(0, 70)) +
  scale_y_continuous(name = "count") +
  ggtitle("Frequency of sum of viability scores:N=##fill-in") +
  theme_bw() +
  theme(axis.line = element_line(size=1, colour = "black"),
        panel.grid.major = element_line(colour = "#d3d3d3"),
        panel.grid.minor = element_blank(),
        panel.border = element_blank(), panel.background = element_blank(),
        plot.title = element_text(size = 14, family = "Tahoma", face = "bold"),
        text=element_text(family="Tahoma"),
        axis.text.x=element_text(colour="black", size = 9),
        axis.text.y=element_text(colour="black", size = 9)) +
  geom_vline(xintercept = ##fill-in, size = 1, colour = "#FF3721",
               linetype = "dashed")
meanViabilityDistributionControl

## Mean viability distribution graph: treatment condition, B group 
## Mean for treatment condition, B group: 
barfill <- "#4271AE"
barlines <- "#1F3552"
meanViabilityDistributionMasked <- ggplot(treatmentBStats, aes(x = sum)) +
  geom_histogram(aes(y = ..count..), binwidth = 5,
                 colour = barlines, fill = barfill) +
  scale_x_continuous(name = "Median viability sum \n across all teams in masked round",
                     breaks = seq(0, 98, 14),
                     limits=c(7, 70)) +
  scale_y_continuous(name = "count") +
  ggtitle("Frequency of sum of viability scores: masked condition, N=##fill-in") +
  theme_bw() +
  theme(axis.line = element_line(size=1, colour = "black"),
        panel.grid.major = element_line(colour = "#d3d3d3"),
        panel.grid.minor = element_blank(),
        panel.border = element_blank(), panel.background = element_blank(),
        plot.title = element_text(size = 14, family = "Tahoma", face = "bold"),
        text=element_text(family="Tahoma"),
        axis.text.x=element_text(colour="black", size = 9),
        axis.text.y=element_text(colour="black", size = 9)) +
  geom_vline(xintercept = ##fill-in, size = 1, colour = "#FF3721",
               linetype = "dashed") 
meanViabilityDistributionMasked

## Boxplot distribution of viability scale sums and repeat team question (example case with treatment and A, Ap and B conditions): 

g <- ggplot(treatmentAStats, aes(factor(repeatTeam, labels = c("Yes", "No")), sum))
g + geom_boxplot(varwidth=T, fill="plum") + 
  labs(subtitle="Sum of viability measures grouped by repeat team question in treatment condition, A group", 
       x="If you had the choice, would you like to work with the same team in a future round? ",
       y="Numeric sum of viability measures questions (range: 7-70)")

g <- ggplot(treatmentBStats, aes(factor(repeatTeam, labels = c("Yes", "No")), sum))
g + geom_boxplot(varwidth=T, fill="plum") + 
  labs(subtitle="Sum of viability measures grouped by repeat team question in treatment condition, B group", 
       x="If you had the choice, would you like to work with the same team in a future round? ",
       y="Numeric sum of viability measures questions (range: 7-70)")

g <- ggplot(treatmentApStats, aes(factor(repeatTeam, labels = c("Yes", "No")), sum))
g + geom_boxplot(varwidth=T, fill="plum") + 
  labs(subtitle="Sum of viability measures grouped by repeat team question in treatment condition, Ap group", 
       x="If you had the choice, would you like to work with the same team in a future round? ",
       y="Numeric sum of viability measures questions (range: 7-70)")

ggplot(fractureLE, aes(prop, prop1)) +
  geom_point(aes(shape=results.condition)) +
  geom_jitter() + coord_fixed() + xlim(0.0,1.0) + ylim(0.0,1.0) + labs(title="Team fracture in first vs. third round in learning effect condition", subtitle="Fracture scale 0=no fracture, 1=fracture",  
                                                                       x="Fracture the first time a team interacts", 
                                                                       groupedProportionFracture <- groupedProportion %>%
                                                                         mutate(fracture = case_when(prop<=.50 ~ "0", prop>.50 ~ "1")) %>% 
                                                                         filter(results.condition=="treatment" & condition=="A" || condition=="Ap")                                                                 y="Fracture the second time a team interacts, without knowing it") 
groupedProportionFracture <- groupedProportion %>%
  mutate(fracture = case_when(prop<=.50 ~ "0", prop>.50 ~ "1")) %>% 
  filter(results.condition=="treatment" & condition=="A" || condition=="Ap")
fracture1 <- groupedProportionFracture %>% filter(condition=="A")
fracture2 <- groupedProportionFracture %>% filter(condition=="Ap")

fracture <- cbind(fracture1, fracture2)
fracture$prop <- 1-fracture$prop
fracture$prop1 <- 1-fracture$prop1

ggplot(treatmentFracture, aes(prop1, prop2)) +
  geom_point() +
  geom_jitter() + coord_fixed() + xlim(0.0,1.0) + ylim(0.0,1.0) + labs(title="Team fracture in the first round vs. fracture in the experimental round", subtitle="Fracture scale 0=no fracture, 1=fracture",  
                                                                       x="Fracture the first time a team interacts", 
                                                                       y="Fracture the second time a team interacts, without knowing it") 


ggplot(controlFracture, aes(prop, prop1)) +
  geom_point() +
  geom_jitter() + coord_fixed() + xlim(0.0,1.0) + ylim(0.0,1.0) + labs(title="Team fracture in the first vs. in the second, control round, n=7 teams", subtitle="Fracture scale 0=no fracture, 1=fracture",  
                                                                       x="Fracture the first time a team interacts", 
                                                                       y="Fracture the second time a team interacts, without knowing it") 



## Proportion graphs for Q15: 
## Revalue repeat team: keep plyr b/c some weird R stuff requires library to be called directly: 
stats$repeatTeam <- plyr::revalue(stats$repeatTeam, c("Yes"="1", "No"="0"))
## Convert to compatible classes for grouping: 
stats$repeatTeam <- as.numeric(stats$repeatTeam)
stats$room <- unlist(stats$room) 

## MSB: is there another way to group_by teams using base R: I'm skeptical of dplyr. If not, triple check computations are accurate below: 

## Table with mean sum for condition (i.e. treatment, baseline, control) and condition format:
xtabs(mean ~ condition + results.format, data=stats) 

## Subset on the fly (from group_by data)
xtabs(prop ~ round + batch + room, data=groupedProportion, subset = condition=="treatment")
xtabs(prop ~ group + batch + room, data=stats, subset = condition=="control")
xtabs(prop ~ group + batch + room, data=stats, subset = condition=="baseline")

## Subset proportions:  

groupedProportion <- stats %>% group_by(round, room, batch, condition, results.condition) %>%
  summarise(n=n(), prop=sum(repeatTeam)/n, mean=mean(sum), median=median(sum)) %>% filter(n>1)

groupedProportion <- stats %>% group_by(round, room, batch) %>%
  summarise(n=n(), prop=prop.table(repeatTeam) %>% filter(n>1))

individualProportion <- stats %>% group_by(round, batch, room) %>% 
  mutate(sum=sum, mean=mean(sum), median=median(sum), n=n(),prop=sum(repeatTeam)/n) %>% filter(n>1)

## Alternatives: 

groupedProportion2 <- plyr::ddply(stats, .list(batch, round, room), summarise, n=n(), prop = sum(repeatTeam)/n)
groupedProportion2 <- groupedProportion %>% filter(n>1)

groupedProportion <- stats %>% group_by(round, room, batch, condition, results.condition) %>%
  summarise(n=n(), prop=sum(repeatTeam)/n, mean=mean(sum), median=median(sum)) %>% filter(n>1)

ggplot(data=groupedProportion, aes(groupedProportion$prop, fill=factor(condition))) + 
  geom_histogram(breaks=seq(0, 1, by=0.20), 
                 col="red", 
                 fill="green", 
                 alpha=.2) + labs(title="Binary proportion of answers for question 15 per team (team size range: 2-4) n=##fill-in teams", 
                                  x="If you had the choice, would you like to work with the same team in a future round? 
                                  1=Yes , 0=No", y="Count") 

ggplot(data=individualProportion, aes(individualProportion$prop)) + 
  geom_histogram(breaks=seq(0, 1, by=0.20), 
                 col="red", 
                 fill="green", 
                 alpha=.2) + labs(title="Binary proportion of answers for question 15 per team: n=##fill-in observations",
                                  x="If you had the choice, would you like to work with the same team in a future round? 
                                  1=Yes , 0=No", y="Count") 


groupedProportionFracture <- groupedProportion %>%
  mutate(fracture = case_when(prop<=.50 ~ "0", prop>.50 ~ "1")) %>% 
  filter(results.condition=="treatment" & condition=="A" || condition=="Ap")

fracture1 <- groupedProportionFracture %>% filter(condition=="A")
fracture2 <- groupedProportionFracture %>% filter(condition=="Ap")
plot(fracture1$prop,fracture2$prop)

fracture <- cbind(fracture1, fracture2)
fracture$prop <- 1-fracture$prop
fracture$prop1 <- 1-fracture$prop1

## how many teams have a 1 in both columns 
## how many have in both 
## how many have none 


ggplot(fracture, aes(prop, prop1)) +
  geom_point() +
  geom_jitter() + coord_fixed() + xlim(0,1) + ylim(0,1) + labs(subtitle="Fracture proportions", 
                                                               x="Fracture round A: the first time a team interacts", 
                                                               y="Fracture round Ap: the second time a team interacts, without knowing it") 

groupedProportionFracture$fracture <- as.numeric(groupedProportionFracture$fracture)
tally(~condition + fracture, data = groupedProportionFracture, format = "proportion")
tally(~fracture | condition, data = groupedProportionFracture, format = "proportion")


## Distribution of median vs. mean per team: 
qplot(mean, prop, data=groupedProportion, 
      main="Scatterplots median vs. mean for viability sum responses per team",
      xlab="mean", ylab="median")

ggplot(groupedProportion, aes(x=prop, y=mean)) + 
  geom_point() +
  stat_smooth(method = "lm", col = "red")

## Indivdiaul proportion with sum:  
fit1 <- lm(mean ~ prop, data = individualProportion, se=TRUE)
summary(fit1)
plot(mean ~ prop, data = individualProportion)
abline(fit1, )

fit1 <- lm(sum ~ prop, data = individualProportion)
summary(fit1)
plot(sum ~ prop, data = individualProportion)
abline(fit1)

fit1 <- lm(median ~ prop, data = groupedProportion)
summary(fit1)
plot(median ~ prop, data = groupedProportion)
abline(fit1)

## Group proportion with sum: 
fit1 <- lm(mean ~ prop, data = groupedProportion)
summary(fit1)
plot(mean ~ prop, data = groupedProportion)
abline(fit1)

fit1 <- lm(median ~ prop, data = groupedProportion)
summary(fit1)
plot(median ~ prop, data = groupedProportion)
abline(fit1)

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

## Import and clean chat data from database: 
+## Chat data import: 
  
chatFiles = lapply(completeBatches, function(batch){
    chatFile = read_json(paste(dataPath,batch,"chats.json",sep="/"), simplifyVector = TRUE)
    return(flatten(chatFile, recursive = TRUE))
  })

allChatFiles <- ldply(chatFiles, data.frame)
chatFreq <- allChatFiles  %>%
  select(round, room, batch) %>% 
  group_by(round, room, batch) %>% 
  dplyr::summarise(n=n()) %>% 
  mutate(sum=prop.table(repeatTeam)) %>% 
  filter(n>1, round<=2)

ggplot(fractureLE, aes(prop, prop1)) +
  geom_point(aes(shape=results.condition)) +
  geom_jitter() + coord_fixed() + xlim(0.0,1.0) + ylim(0.0,1.0) + labs(title="Team fracture in first round vs. third in learning effect condition", subtitle="Fracture scale 0=no fracture, 1=fracture",  
                                                                       x="Fracture the first time a team interacts", 
                                                                       y="Fracture the second time a team interacts, without knowing it") 

## Filter on round <=2, because round 3 in all but one case is only includes "X has left chat room" 

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

g <- ggplot(treatmentFracture, aes(abs)) + scale_fill_brewer(palette = "Spectral")
g + geom_histogram(bins=7, 
                   col="pink", 
                   size=.4) + 
  labs(title="Absolute value of change in team fracture proportions between unmasked and masked", 
       fill = "Round") + 
  xlab(label="Absolute value of change in team fracture proportions between unmasked and masked ") + 
  ylab(label="Count") 

library(ggplot2)
theme_set(theme_bw())  

# Data Prep

mtcars$`car name` <- rownames(mtcars)  # create new column for car names
mtcars$mpg_z <- round((groupedProportionFractureTreatment$fracture - mean(groupedProportionFractureTreatment$fracture))/sd(groupedProportionFractureTreatment$fracture), 2)  # compute normalized mpg
mtcars$mpg_type <- ifelse(mtcars$mpg_z < 0, "below", "above")  # above / below avg flag
mtcars <- mtcars[order(mtcars$mpg_z), ]  # sort
mtcars$`car name` <- factor(mtcars$`car name`, levels = mtcars$`car name`)  # convert to factor to retain sorted order in plot.

# Diverging Barcharts
ggplot(mtcars, aes(x=`car name`, y=mpg_z, label=mpg_z)) + 
  geom_bar(stat='identity', aes(fill=mpg_type), width=.5)  +
  scale_fill_manual(name="Mileage", 
                    labels = c("Above Average", "Below Average"), 
                    values = c("above"="#00ba38", "below"="#f8766d")) + 
  labs(subtitle="Normalised mileage from 'mtcars'", 
       title= "Diverging Bars") + 
  coord_flip()

g <- ggplot(data, aes(x=main_category, fill=factor(state)))
g+ geom_bar(position="dodge") +
  xlab(label="Main Category") +
  ylab(label="Number of Backers") + 
  labs(title="Backers by Category" , fill = "State of Campaign")



