import sys
import uuid
from googleads import adwords

# print("THIS IS WORKING")
# # print(sys.argv[1])

# adwords_client = adwords.AdWordsClient.LoadFromStorage('~/Scaled-Humanity/ads-integration/googleads.yaml')
# ad_group_id = '55035088222'
# NUMBER_OF_ADS = sys.argv[2] # should be 1
# headline_part_1 = sys.argv[3]
# headline_part_2 = sys.argv[4]
# description = sys.argv[5]
# finalURL = sys.argv[6]

# # Creates an ad group
# def makeAd():
#     print("making an ad")

#     # Initialize appropriate service.
#     ad_group_ad_service = adwords_client.GetService('AdGroupAdService', version='v201806')

#     operations = [
#         {
#             'operator': 'ADD',
#             'operand': {
#                 'xsi_type': 'AdGroupAd',
#                 'adGroupId': ad_group_id,
#                 'ad': {
#                     'xsi_type': 'ExpandedTextAd',
#                     'headlinePart1': headline_part_1,
#                     'headlinePart2': headline_part_2,
#                     'description': description,
#                     'finalUrls': [finalURL],
#                 },
#             }
#         }
#     ]
#     ads = ad_group_ad_service.mutate(operations)

#     # Display results.
#     for ad in ads['value']:
#         print ('Ad of type "%s" with id "%d" was added.'
#             '\n\theadlinePart1: %s\n\theadlinePart2: %s'
#             % (ad['ad']['Ad.Type'], ad['ad']['id'],
#                 ad['ad']['headlinePart1'], ad['ad']['headlinePart2']))


# # Kills an ad group by setting the status to 'REMOVED'.
# def killAd():
#     print ("killing an ad")
#     # Initialize appropriate service.
#     ad_group_service = adwords_client.GetService('AdGroupService', version='v201806')
#     # Construct operations and delete ad group.
#     operations = [{
#         'operator': 'SET',
#         'operand': {
#             'id': ad_group_id,
#            'status': 'REMOVED'
#             }
#         }]
#     result = ad_group_service.mutate(operations)
#     # Display results.
#     for ad_group in result['value']:
#          print ('Ad group with name "%s" and id "%s" was deleted.'
#          % (ad_group['name'], ad_group['id']))

# def checkAd():
#     print ("checking an ad")
#     print ("nothing here yet")

# # map the inputs to the function blocks
# options = {0: makeAd,
#            1: killAd,
#            2: checkAd,
# }

# def getNumber(arg) :
#     if arg == "makeAd":
#         return 0
#     elif arg == "killAd":
#         return 1
#     elif arg == "checkAd":
#         return 2

# number = getNumber(sys.argv[1])

# options[number]()

# sys.stdout.flush()

# Set up... 
# https://github.com/googleads/googleads-python-lib

import argparse

from google_auth_oauthlib.flow import InstalledAppFlow
from oauthlib.oauth2.rfc6749.errors import InvalidGrantError

# Your OAuth2 Client ID and Secret. If you do not have an ID and Secret yet,
# please go to https://console.developers.google.com and create a set.
DEFAULT_CLIENT_ID = '774157528661-fg4dmem0nn591ikfmo2igrfavg2vsttm.apps.googleusercontent.com'
DEFAULT_CLIENT_SECRET = 'X93lOY4G3YSvQaEvojXvF9J8'

# The AdWords API OAuth2 scope.
SCOPE = u'https://www.googleapis.com/auth/adwords'
# The redirect URI set for the given Client ID. The redirect URI for Client ID
# generated for an installed application will always have this value.
_REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob'

parser = argparse.ArgumentParser(description='Generates a refresh token with '
                                 'the provided credentials.')
parser.add_argument('--client_id', default=DEFAULT_CLIENT_ID,
                    help='Client Id retrieved from the Developer\'s Console.')
parser.add_argument('--client_secret', default=DEFAULT_CLIENT_SECRET,
                    help='Client Secret retrieved from the Developer\'s '
                    'Console.')
parser.add_argument('--additional_scopes', default=None,
                    help='Additional scopes to apply when generating the '
                    'refresh token. Each scope should be separated by a comma.')


class ClientConfigBuilder(object):
  """Helper class used to build a client config dict used in the OAuth 2.0 flow.
  """
  _DEFAULT_AUTH_URI = 'https://accounts.google.com/o/oauth2/auth'
  _DEFAULT_TOKEN_URI = 'https://accounts.google.com/o/oauth2/token'
  CLIENT_TYPE_WEB = 'web'
  CLIENT_TYPE_INSTALLED_APP = 'installed'

  def __init__(self, client_type=None, client_id=None, client_secret=None,
               auth_uri=_DEFAULT_AUTH_URI, token_uri=_DEFAULT_TOKEN_URI):
    self.client_type = client_type
    self.client_id = client_id
    self.client_secret = client_secret
    self.auth_uri = auth_uri
    self.token_uri = token_uri

  def Build(self):
    """Builds a client config dictionary used in the OAuth 2.0 flow."""
    if all((self.client_type, self.client_id, self.client_secret,
            self.auth_uri, self.token_uri)):
      client_config = {
          self.client_type: {
              'client_id': self.client_id,
              'client_secret': self.client_secret,
              'auth_uri': self.auth_uri,
              'token_uri': self.token_uri
          }
      }
    else:
      raise ValueError('Required field is missing.')

    return client_config


def main(client_id, client_secret, scopes):
  """Retrieve and display the access and refresh token."""
  client_config = ClientConfigBuilder(
      client_type=ClientConfigBuilder.CLIENT_TYPE_WEB, client_id=client_id,
      client_secret=client_secret)

  flow = InstalledAppFlow.from_client_config(
      client_config.Build(), scopes=scopes)
  # Note that from_client_config will not produce a flow with the
  # redirect_uris (if any) set in the client_config. This must be set
  # separately.
  flow.redirect_uri = _REDIRECT_URI

  auth_url, _ = flow.authorization_url(prompt='consent')

  print ('Log into the Google Account you use to access your AdWords account '
         'and go to the following URL: \n%s\n' % auth_url)
  print 'After approving the token enter the verification code (if specified).'
  code = raw_input('Code: ').strip()

  try:
    flow.fetch_token(code=code)
  except InvalidGrantError as ex:
    print 'Authentication has failed: %s' % ex
    sys.exit(1)

  print 'Access token: %s' % flow.credentials.token
  print 'Refresh token: %s' % flow.credentials.refresh_token


if __name__ == '__main__':
  args = parser.parse_args()
  configured_scopes = [SCOPE]
  if not (any([args.client_id, DEFAULT_CLIENT_ID]) and
          any([args.client_secret, DEFAULT_CLIENT_SECRET])):
    raise AttributeError('No client_id or client_secret specified.')
  if args.additional_scopes:
    configured_scopes.extend(args.additional_scopes.replace(' ', '').split(','))
  main(args.client_id, args.client_secret, configured_scopes)