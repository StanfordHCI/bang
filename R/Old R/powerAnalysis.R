## Power analysis in R: 

## What we need to do: 
## Run all three conditions: control, baseline and treatment 
## Compare fracture probability differences between control and treatment 
## Run a Z-test based on results (e.g.): 

prop.test(x = c(0.2820513, 0.7179487), n = c(100, 100),
alternative = "two.sided")

## Example power analysis template: 

power.prop.test(n = NULL, p1 = 0.6, p2 = 0.3, sig.level = 0.05,
                power = .80,
                alternative = c("two.sided"),
                strict = FALSE, tol = .Machine$double.eps^0.25)

## Depending on the results from this test, we can determine if we are justified in using a parametric test. 
## If, data passes normality tests, then we can use the following tests: 
## T-Test. We can use a two-sample T-test to asses if there is a difference in the scores of specific groups:
## Examples: 
## First use a boxplot for visualization to identify a relationship. 

## If normality assumptions are met: 
## Is there a significant difference between viability sums between conditions: masked // unmasked? 

pairedTest <-  subset(stats, condition=="masked" | condition=="unmasked") 
t.test(sum~condition, data=pairedTest)