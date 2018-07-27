## Setting up all the libraries: 

rm(list=ls())
getwd()
setwd("/Users/allieblaising/desktop")
library(psych)
library(GPArotation)
library(psych)
library(tidyverse)
library(purrr)
library(dplyr)
library(jsonlite)
library(likert) 
library(lavaan) 
library(dplyr)
library(rlist)
library(httr)
library(stringr)
library(ggplot2)

input = '[{"userID":"qL44K5kHvqZwHuzcAAAA","room":"B","name":"niceWolf","round":1,"midSurvey":["1=Strongly Disagree","2=Neutral","3=Agree","4=Neutral","5=Neutral","6=Agree","7=Agree","8=Agree","9=Agree","10=Agree","11=Agree","12=Agree","13=Agree","14=Agree","15=Yes"],"batch":1532028198071,"_id":"7CSvj5od8c38l7ZF"}
,{"userID":"1pob6EHCHwzLa7nUAAAB","room":"A","name":"culturedCat","round":1,"midSurvey":["1=Agree","2=Agree","3=Strongly Agree","4=Strongly Agree","5=Agree","6=Strongly Agree","7=Strongly Agree","8=Agree","9=Agree","10=Agree","11=Strongly Agree","12=Agree","13=Strongly Agree","14=Agree","15=Yes"],"batch":1532028198071,"_id":"rswvLzmgBBSPR2sz"}
,{"userID":"FGzkFbpp8ejWVSm0AAAC","room":"B","name":"niceRabbit","round":1,"midSurvey":["1=Neutral","2=Neutral","3=Neutral","4=Neutral","5=Neutral","6=Neutral","7=Neutral","8=Disagree","9=Disagree","10=Disagree","11=Strongly Disagree","12=Strongly Disagree","13=Strongly Disagree","14=Disagree","15=No"],"batch":1532028198071,"_id":"8E893jSKIj97pYVV"}
,{"userID":"-2emRdtAMYWaULymAAAD","room":"A","name":"conventionalDeer","round":1,"midSurvey":["1=Disagree","2=Disagree","3=Disagree","4=Disagree","5=Disagree","6=Neutral","7=Neutral","8=Disagree","9=Neutral","10=Neutral","11=Neutral","12=Disagree","13=Neutral","14=Disagree","15=No"],"batch":1532028198071,"_id":"u7JiHQ0GbMtl1K1f"}
,{"userID":"qL44K5kHvqZwHuzcAAAA","room":"A","name":"niceWolf","round":2,"midSurvey":["1=Disagree","2=Disagree","3=Disagree","4=Neutral","5=Neutral","6=Neutral","7=Disagree","8=Neutral","9=Neutral","10=Neutral","11=Agree","12=Agree","13=Neutral","14=Agree","15=Yes"],"batch":1532028198071,"_id":"PGPqlkL9yVpMiMYL"}
,{"userID":"1pob6EHCHwzLa7nUAAAB","room":"B","name":"culturedCat","round":2,"midSurvey":["1=Disagree","2=Strongly Disagree","3=Strongly Disagree","4=Disagree","5=Strongly Disagree","6=Disagree","7=Strongly Disagree","8=Disagree","9=Disagree","10=Strongly Disagree","11=Disagree","12=Disagree","13=Strongly Disagree","14=Disagree","15=No"],"batch":1532028198071,"_id":"E9VRKdzucacS0yyZ"}
,{"userID":"FGzkFbpp8ejWVSm0AAAC","room":"B","name":"niceRabbit","round":2,"midSurvey":["1=Disagree","2=Strongly Disagree","3=Strongly Disagree","4=Disagree","5=Strongly Disagree","6=Disagree","7=Neutral","8=Strongly Disagree","9=Neutral","10=Strongly Disagree","11=Neutral","12=Strongly Disagree","13=Disagree","14=Disagree","15=No"],"batch":1532028198071,"_id":"p0QnSqMlmFSbVHLF"}
,{"userID":"-2emRdtAMYWaULymAAAD","room":"A","name":"conventionalDeer","round":2,"midSurvey":["1=Disagree","2=Neutral","3=Disagree","4=Strongly Disagree","5=Neutral","6=Neutral","7=Neutral","8=Disagree","9=Disagree","10=Disagree","11=Neutral","12=Strongly Disagree","13=Neutral","14=Disagree","15=No"],"batch":1532028198071,"_id":"RYtBtN1O5HbwVUgX"}
,{"userID":"-2emRdtAMYWaULymAAAD","room":"A","name":"conventionalDeer","round":3,"midSurvey":["1=Agree","2=Agree","3=Agree","4=Agree","5=Strongly Agree","6=Strongly Agree","7=Strongly Agree","8=Strongly Agree","9=Agree","10=Strongly Agree","11=Agree","12=Strongly Agree","13=Agree","14=Strongly Agree","15=Yes"],"batch":1532028198071,"_id":"BBXovwXR3zgzuoXe"}
,{"userID":"FGzkFbpp8ejWVSm0AAAC","room":"B","name":"niceRabbit","round":3,"midSurvey":["1=Strongly Agree","2=Agree","3=Strongly Agree","4=Agree","5=Agree","6=Agree","7=Strongly Agree","8=Strongly Agree","9=Agree","10=Strongly Agree","11=Strongly Agree","12=Agree","13=Strongly Agree","14=Strongly Agree","15=Yes"],"batch":1532028198071,"_id":"7aR6XVuPSJsPmrkW"}
,{"userID":"1pob6EHCHwzLa7nUAAAB","room":"A","name":"culturedCat","round":3,"midSurvey":["1=Agree","2=Strongly Agree","3=Strongly Agree","4=Agree","5=Agree","6=Agree","7=Agree","8=Agree","9=Neutral","10=Agree","11=Strongly Agree","12=Agree","13=Agree","14=Strongly Agree","15=Yes"],"batch":1532028198071,"_id":"JCqaTTQhS7bpNmna"}
,{"userID":"qL44K5kHvqZwHuzcAAAA","room":"B","name":"niceWolf","round":3,"midSurvey":["1=Agree","2=Strongly Agree","3=Strongly Agree","4=Agree","5=Strongly Agree","6=Agree","7=Strongly Agree","8=Agree","9=Neutral","10=Strongly Agree","11=Agree","12=Strongly Agree","13=Strongly Agree","14=Strongly Agree","15=Yes"],"batch":1532028198071,"_id":"BN2PZWOEZy4O5yhX"}
]'

experiment = fromJSON(input, simplifyDataFrame = TRUE)
experiment <- as.data.frame(experiment)

## example of how to extract and spread survey data (todo: make 15 lines of code down to like 2 lol @me)

for (i in 1:length(experiment$midSurvey)) { 
  experiment$Q1[i] <- substr(experiment$midSurvey[[i]][1], 3, 20)
  experiment$Q2[i] <- substr(experiment$midSurvey[[i]][2], 3, 20)
  experiment$Q3[i] <- substr(experiment$midSurvey[[i]][3], 3, 20)
  experiment$Q4[i] <- substr(experiment$midSurvey[[i]][4], 3, 20)
  experiment$Q5[i] <- substr(experiment$midSurvey[[i]][5], 3, 20)
  experiment$Q6[i] <- substr(experiment$midSurvey[[i]][6], 3, 20)
  experiment$Q7[i] <- substr(experiment$midSurvey[[i]][7], 3, 20)
  experiment$Q8[i] <- substr(experiment$midSurvey[[i]][8], 3, 20)
  experiment$Q9[i] <- substr(experiment$midSurvey[[i]][9], 3, 20)
  experiment$Q10[i] <- substr(experiment$midSurvey[[i]][10], 4, 20)
  experiment$Q11[i] <- substr(experiment$midSurvey[[i]][11], 4, 20)
  experiment$Q12[i] <- substr(experiment$midSurvey[[i]][12], 4, 20)
  experiment$Q13[i] <- substr(experiment$midSurvey[[i]][13], 4, 20)
  experiment$Q14[i] <- substr(experiment$midSurvey[[i]][14], 4, 20)
  experiment$RTQ[i] <- substr(experiment$midSurvey[[i]][15], 4, 20)
} 

## Example of many ways to group (e.g. group by round & select specific columns of interest like Q1-Q14 & RTQ only):  

experiment %>%
  group_by(round) %>%
  select(room, round, name, Q1:Q14, RTQ)

## Example of selecting a specific round & room: 

test <- experiment %>%
  filter(round == "1", room == "A") %>% 
  select(room, round, Q1:Q14)

## Example of a few extremely basic exploratory plots: 

## Distribution of scale question answers for Q1 in room A across all rounds: 

g <- ggplot(experiment, aes(x=Q1, fill=factor(room)))
g + geom_bar(position="dodge") +
  xlab(label="Likert Responses") +
  labs(title="Distribution of Q1 Responses by Room", fill="Room")

## Distribution of repeat team question answers for all rooms: 

g <- ggplot(experiment, aes(x=RTQ, fill=factor(room)))
g + geom_bar(position="dodge") +
  xlab(label="Likert responses") +
  labs(title="Distribution of repeat team questions across all teams", fill="Room")

## Distribution of repeat team questions answers by round: 

g <- ggplot(experiment, aes(x=RTQ, fill=factor(round)))
g + geom_bar(position="dodge") +
  xlab(label="Likert responses") +
  labs(title="Distribution of repeat team across all teams", fill="Round")

## Distribution of repeat team questions answers by room: 

g2 <- ggplot(experiment, aes(x=round, fill=factor(room)))
g2 + geom_bar() + facet_grid(.~RTQ) + 
  theme(
    axis.text.x=element_blank(),
    axis.ticks.x=element_blank()) + 
  xlab(label="") + 
  ylab(label="") + 
  labs(title="Distribution of answers for repeat team question", fill="Room")

## Example pie chart: 

pie <- ggplot(experiment, aes(x = "", fill = factor(RTQ))) + 
  geom_bar(width = 1) +
  theme(axis.line = element_blank(), 
        plot.title = element_text(hjust=0.5)) + 
  labs(fill="Repeat team question answers:", 
       x=NULL, 
       y=NULL, 
       title="Repeat team question across all teams and rounds", 
       caption="")
pie + coord_polar(theta = "y", start=0)

## More cleaning // dplyr examples: 

experimentround2 <- experiment %>% 
  filter(round=="2")

## Formal likert analysis: 

## Setting up question names: 

## Convert to factor for likert analysis: 

levels <- c("Strongly Disagree", "Disagree", "Neutral","Agree", "Strongly Agree") 
levels2 <- c("Yes","No")
experiment2 <- experiment %>% 
  mutate_at(.vars = vars(Q1:Q14), funs(factor(., levels = levels))) %>% 
  mutate_at(.vars = vars(RTQ), funs(factor(., levels = levels2))) 

## Summaries / basic descriptive stats for likert :

summary(experiment2[,8:22])

## Example of table distribution for survey Q1 + repeat team question: 
table(experiment2[, 8], as.numeric(experiment2[, 8]))
table(experiment2[, 22], as.numeric(experiment2[, 22]))

## Plotting likert question distributions with likert titles: 

experiment3 <- experiment2
names(experiment3) <- c("userID", "room", "name", "round", "midSurvey", "batch", "_id", "1. The members of this team could work for a long time together" 
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
                       " 14. This team has what it takes to endure in future performance episodes." , 
                       "Would you like to continue to work with this team?") 

## Likert plots: 

## Basic likert plot: 

likert.out <- likert(experiment3[,8:21])
plot(likert.out)

## Likert plot grouping by Q15: "Would you like to work with this team again?": 

likert.out.group <- likert(experiment2, grouping = experiment2$RTQ) 
plot(likert.out.group, group.order=experiment2$RTQ) + theme(text=element_text(size=14)) 
plot(likert.out, centered=FALSE, low.color="firebrick", 
     high.color="forestgreen") + 
  theme(text=element_text(size=14))

## Likert heat plot:
plot(likert.out,	type='heat',	wrap=30,	text.size=4)

## Likert density curve: 
plot(likert.out,	type='density')

## Likert density plot 2.0
likert.out2 <- likert(experiment3[,8:12])
plot(likert.out2,	type='density')


## Converting to numeric for stats analysis (need to figure out how to make this into 2 lines lol @me again)

for (i in 1:nrow(experiment2)) {
experiment2$nominalQ1 <- as.numeric(experiment2$Q1) 
experiment2$nominalQ2 <- as.numeric(experiment2$Q2)
experiment2$nominalQ3 <- as.numeric(experiment2$Q3)
experiment2$nominalQ4 <- as.numeric(experiment2$Q4)
experiment2$nominalQ5 <- as.numeric(experiment2$Q5)
experiment2$nominalQ6 <- as.numeric(experiment2$Q6)
experiment2$nominalQ7 <- as.numeric(experiment2$Q7)
experiment2$nominalQ8 <- as.numeric(experiment2$Q8)
experiment2$nominalQ9 <- as.numeric(experiment2$Q9)
experiment2$nominalQ10 <- as.numeric(experiment2$Q10)
experiment2$nominalQ11 <- as.numeric(experiment2$Q11)
experiment2$nominalQ12 <- as.numeric(experiment2$Q12)
experiment2$nominalQ13 <- as.numeric(experiment2$Q13)
experiment2$nominalQ14 <- as.numeric(experiment2$Q14)
experiment2$nominalQ15 <- as.numeric(experiment2$RTQ)                                 
} 

## Loop to create sums for data analysis: 

for (i in 1:nrow(experiment2)) {
  experiment2$sum[i] <- sum(experiment2[,23:36][i])                             
} 

## Assessing parametric normality: 

hist(experiment2$sum,xlab="Sum of scores",main="")

## From the histogram above we can “unofficially”conclude that our data is relitively Normal, 
## hance we are somewhat justified in using parametric statistical methodology.

boxplot(sum~nominalQ15,data=experiment2,names=c("Continue working with team",
                                                "Stop working with team"))

t.test(Base.ratio.1~A.ratio.1,data=ads2)

## Anova for survey questions, starting with repeat team question with sum of scores: 

anova(lm(sum~RTQ,data=experiment2))

## Blacklist importing, cleaning & merging: 

input2 = '[{"userID":"qL44K5kHvqZwHuzcAAAA","name":"niceWolf","midSurvey":"blacklist-q1=1","batch":1532028198071,"_id":"BGXqnkNyGqqpHP2c"}
,{"userID":"1pob6EHCHwzLa7nUAAAB","name":"culturedCat","midSurvey":"blacklist-q1=2","batch":1532028198071,"_id":"ELtcSJgRysGlBB77"}
,{"userID":"FGzkFbpp8ejWVSm0AAAC","name":"niceRabbit","midSurvey":"blacklist-q1=2","batch":1532028198071,"_id":"V37TWQFeRT0CwIf6"}
,{"userID":"-2emRdtAMYWaULymAAAD","name":"conventionalDeer","midSurvey":"blacklist-q1=2","batch":1532028198071,"_id":"uXGDrroAYDrKaIVh"}]'

blacklist = fromJSON(input2, simplifyDataFrame = TRUE)
blacklist <- as.data.frame(blacklist)

for (i in 1:length(blacklist$midSurvey)) { 
  blacklist$blacklist[i] <- substr(blacklist$midSurvey[i], 14, 20)
} 

## Factoring for stats analysis 

levels3 <- c(1:3)
blacklist <- blacklist %>% 
  mutate_at(.vars = vars(blacklist), funs(factor(., levels = levels3))) 

## Factor summary / basic descriptive stats for likert :

summary(blacklist)
g2 <- ggplot(test, aes(x=blacklist, fill=Q1:Q14))
g2 + geom_bar(position="dodge") +
  xlab(label="") +
  labs(title="", fill="Blacklisted teams")

## Feedback to see if this is testing what we need it to be: 

mergetest <- merge(experiment2,blacklist,by="name") 

## Scale validity 

## Exploratory factor analysis introduction: 

pca2 <- principal(data.matrix(experiment2[,8:21])) 
print(pca2)
KMO(data.matrix(experiment2[,8:12]))

## Calculating the number of factors 

scale <- experiment2[, 8:21]

parallel <- fa.parallel(scale, fm = 'minres', fa = 'fa')

## Results show the maximum number of factors we can consider. 

## Factor analysis now that we know # of factors: 

## Using oblimin because we believe we believe that there is correlation in the factors. 

threefactor <- fa(scale,nfactors = 3,rotate = "oblimin",fm="minres")
print(threefactor)

## Output shows loadings and factors 

## Next, consider the loadings more than 0.3 and not loading on more than one factor: 

print(threefactor$loadings,cutoff = 0.3)

## Based on this output we will consider X factors: 

fourfactor <- fa(data,nfactors = 4,rotate = "oblimin",fm="minres")
print(fourfactor$loadings,cutoff = 0.3)

## Importing & cleaning manipulation data: 