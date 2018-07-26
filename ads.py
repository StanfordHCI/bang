import sys
from googleads import adwords

print("THIS IS WORKING")
# print(sys.argv[1])

# define the function blocks
def makeAd():
    print("this is make ad")

def killAd():
    print ("this is kill ad")

def checkAd():
    print ("this is check ad")

# map the inputs to the function blocks
options = {0: makeAd,
           1: killAd,
           2: checkAd,
}

def getNumber(arg) :
    if arg == "makeAd":
        return 0
    elif arg == "killAd":
        return 1
    elif arg == "checkAd":
        return 2

number = getNumber(sys.argv[1])

options[number]()

sys.stdout.flush()


# AD_GROUP_ID = 'INSERT_AD_GROUP_ID_HERE'

# Set up... 
# https://github.com/googleads/googleads-python-lib

# ^ possibly a switch statement to call functions depending on arguemnt string

# Make an ad group
# Kill an ad group
# Check up on an ad group


# # Kills an ad group by setting the status to 'REMOVED'.

# def mainDelete(client, ad_group_id):
#   # Initialize appropriate service.
#   ad_group_service = client.GetService('AdGroupService', version='v201806')
#   # Construct operations and delete ad group.
#   operations = [{
#       'operator': 'SET',
#       'operand': {
#           'id': ad_group_id,
#           'status': 'REMOVED'
#       }
#   }]
#   result = ad_group_service.mutate(operations)
#   # Display results.
#   for ad_group in result['value']:
#     print ('Ad group with name "%s" and id "%s" was deleted.'
#            % (ad_group['name'], ad_group['id']))

# # Creates an add group

# def mainAdd(client, ad_group_id):
#   # Initialize appropriate service.
#   ad_group_criterion_service = client.GetService('AdGroupCriterionService', version='v201806')
#   # Construct keyword ad group criterion object.
#   keyword1 = {
#       'xsi_type': 'BiddableAdGroupCriterion',
#       'adGroupId': ad_group_id,
#       'criterion': {
#           'xsi_type': 'Keyword',
#           'matchType': 'BROAD',
#           'text': 'mars'
#       },
#       # These fields are optional.
#       'userStatus': 'PAUSED',
#       'finalUrls': {
#           'urls': ['http://example.com/mars']
#       }
#   }
#   keyword2 = {
#       'xsi_type': 'NegativeAdGroupCriterion',
#       'adGroupId': ad_group_id,
#       'criterion': {
#           'xsi_type': 'Keyword',
#           'matchType': 'EXACT',
#           'text': 'pluto'
#       }
#   }
#   # Construct operations and add ad group criteria.
#   operations = [
#       {
#           'operator': 'ADD',
#           'operand': keyword1
#       },
#       {
#           'operator': 'ADD',
#           'operand': keyword2
#       }
#   ]
#   ad_group_criteria = ad_group_criterion_service.mutate(
#       operations)['value']
#   # Display results.
#   for criterion in ad_group_criteria:
#     print ('Keyword ad group criterion with ad group id "%s", criterion id '
#            '"%s", text "%s", and match type "%s" was added.'
#            % (criterion['adGroupId'], criterion['criterion']['id'],
#               criterion['criterion']['text'],
#               criterion['criterion']['matchType']))


# if __name__ == '__main__':
#   # Initialize client object.
#   adwords_client = adwords.AdWordsClient.LoadFromStorage()
#   main(sys.argv[1], adwords_client, AD_GROUP_ID)  
