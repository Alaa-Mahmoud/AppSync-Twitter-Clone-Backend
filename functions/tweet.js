const DynamoDB = require('aws-sdk/clients/dynamodb');
const ulid = require('ulid');
const { TweetsType } = require('../lib/constants');

const DocumentClient = new DynamoDB.DocumentClient();

const { USERS_TABLE, TWEETS_TABLE, TIMELINES_TABLE } = process.env;

async function tweet(event) {
  const { text } = event.arguments;
  const { username } = event.identity;
  const id = ulid.ulid();
  const timestamp = new Date().toJSON();
  const newTweet = {
    __typename: TweetsType.TWEET,
    id,
    text,
    creator: username,
    createdAt: timestamp,
    likes: 0,
    replies: 0,
    retweets: 0
  };

  await DocumentClient.transactWrite({
    TransactItems: [{
      Put: {
        TableName: TWEETS_TABLE,
        Item: newTweet
      }
    }, {
      Put: {
        TableName: TIMELINES_TABLE,
        Item: {
          userId: username,
          tweetId: id,
          timestamp
        }
      }
    }, {
      Update: {
        TableName: USERS_TABLE,
        Key: {
          id: username
        },
        UpdateExpression: 'ADD tweetsCount :one',
        ExpressionAttributeValues: {
          ':one': 1
        },
        ConditionExpression: 'attribute_exists(id)'
      }
    }]
  }).promise();

  return newTweet;
}

module.exports.handler = tweet;
