import sys
import uuid
from googleads import adwords

print("THIS IS WORKING")
# print(sys.argv[1])

adwords_client = adwords.AdWordsClient.LoadFromStorage('~/Scaled-Humanity/ads-integration/googleads.yaml')
ad_group_id = '55035088222'
NUMBER_OF_ADS = sys.argv[2] # should be 1
headline_part_1 = sys.argv[3]
headline_part_2 = sys.argv[4]
description = sys.argv[5]
finalURL = sys.argv[6]

# Creates an ad group
def makeAd():
    print("making an ad")

    # Initialize appropriate service.
    ad_group_ad_service = adwords_client.GetService('AdGroupAdService', version='v201806')

    operations = [
        {
            'operator': 'ADD',
            'operand': {
                'xsi_type': 'AdGroupAd',
                'adGroupId': ad_group_id,
                'ad': {
                    'xsi_type': 'ExpandedTextAd',
                    'headlinePart1': headline_part_1,
                    'headlinePart2': headline_part_2,
                    'description': description,
                    'finalUrls': [finalURL],
                },
            }
        }
    ]
    ads = ad_group_ad_service.mutate(operations)

    # Display results.
    for ad in ads['value']:
        print ('Ad of type "%s" with id "%d" was added.'
            '\n\theadlinePart1: %s\n\theadlinePart2: %s'
            % (ad['ad']['Ad.Type'], ad['ad']['id'],
                ad['ad']['headlinePart1'], ad['ad']['headlinePart2']))


# Kills an ad group by setting the status to 'REMOVED'.
def killAd():
    print ("killing an ad")
    # Initialize appropriate service.
    ad_group_service = adwords_client.GetService('AdGroupService', version='v201806')
    # Construct operations and delete ad group.
    operations = [{
        'operator': 'SET',
        'operand': {
            'id': ad_group_id,
           'status': 'REMOVED'
            }
        }]
    result = ad_group_service.mutate(operations)
    # Display results.
    for ad_group in result['value']:
         print ('Ad group with name "%s" and id "%s" was deleted.'
         % (ad_group['name'], ad_group['id']))

def checkAd():
    print ("checking an ad")
    print ("nothing here yet")

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

# Set up... 
# https://github.com/googleads/googleads-python-lib
