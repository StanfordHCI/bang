## Data script: 

rm(list=ls())
getwd()
setwd("/Users/allieblaising/desktop")
ads <- read.csv("Ads.csv", header = TRUE)

## allie todo: 
## z & t tests 
## across team and condition analysis 
## graphs, graphs, graphs 

## WARNING: graphs & tests are not fully thought through, PROCEED WITH CAUTION! 

ads2 <- ads %>%
  group_by(team) %>%
  select(condition, team, Base.ratio.1, A.ratio.1, Base.ratio.2, A.ratio.2, Base.ratio.3, A.ratio.3) %>%
  mutate(diff1 = (Base.ratio.1 - A.ratio.1), diff2 = (Base.ratio.2 - A.ratio.2), diff3 = (Base.ratio.3 - A.ratio.3))

## Example of filtering by treatment for later analysis:  

ads.treatment1 <- ads %>%
  filter(team=="Treatment 1") %>%
  select(condition, team, Base.ratio.1, A.ratio.1, Base.ratio.2, A.ratio.2, Base.ratio.3, A.ratio.3) %>%
  mutate(diff1 = (Base.ratio.1 - A.ratio.1), diff2 = (Base.ratio.2 - A.ratio.2), diff3 = (Base.ratio.3 - A.ratio.3))

ads.treatment2 <- ads %>%
  filter(team=="Treatment 2") %>%
  select(condition, team, Base.ratio.1, A.ratio.1, Base.ratio.2, A.ratio.2, Base.ratio.3, A.ratio.3) %>%
  mutate(diff1 = (Base.ratio.1 - A.ratio.1), diff2 = (Base.ratio.2 - A.ratio.2), diff3 = (Base.ratio.3 - A.ratio.3))

## Boxplot of differences in click through rates for base ratio a & b across different conditions & treatments: 
#conditions: 
boxplot(diff1~condition, ads2)
boxplot(diff2~condition, ads2)
boxplot(diff3~condition, ads2)

#teams
boxplot(diff1~team, ads2)
boxplot(diff2~team, ads2)
boxplot(diff3~team, ads2)

## Paired t-tests with two-numeric: 

t.test(ads2$Base.ratio.1, ads2$A.ratio.1,paired=TRUE)
t.test(ads2$Base.ratio.2, ads2$A.ratio.2,paired=TRUE)
t.test(ads2$Base.ratio.3, ads2$A.ratio.3,paired=TRUE)

# Independent 2-group t-test
## how much did results in product 1 deviate 

ads_sd <- ads %>% 
    mutate(sd1 = sd(ads$Base.ratio.1, na.rm=T)) %>%
    mutate(sd2 = sd(ads$Base.ratio.2, na.rm=T)) %>%
    mutate(sd3 = sd(ads$Base.ratio.3, na.rm=T)) 

ggplot(data = ads_sd) +
  geom_histogram(aes(x = sd1), bins = 4, colour = "black", fill = "white") +
  facet_wrap(~ team)

boxplot(sd1~, ads_sd)
boxplot(sd2~team, ads_sd)
boxplot(sd3~team, ads_sd)

# where y is numeric and x is a binary factor

## starting anova, testing if there is a difference between the difference in scoring for 

diff1condition <- aov(diff1 ~ condition, data=ads2)
diff1team <- aov(diff1 ~ team, data=ads2)
plot(diff1condition) 
plot(diff1team)
summary(diff1condition)
summary(diff1team)

## user groups & treatment group across all 

View(ads)

## Manipulation checks: 

people <- read.csv("People.csv", header = TRUE)

head(people)
people2 <- people %>%
  group_by(condition) %>%
  summarise(total = sum(manipulation))

ads2 <- ads %>%
  group_by(team) %>%

  spread()
  