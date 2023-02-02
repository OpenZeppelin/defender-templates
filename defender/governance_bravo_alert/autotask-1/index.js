const stackName = 'governance_alert';
const blockExplorerSecretName = `${stackName}_block_explorer_base_url`;

function getProposalTitle(proposalId) {
  const shortProposalId = `${proposalId.slice(0,4)}..${proposalId.slice(proposalId.length-4)}`
  const title = `Proposal ${shortProposalId}`;
  return title;
}

function getProposalTitleFromDescription(description) {
  const lines = description.split('\n');
  let [proposalName] = lines;
  // remove markdown heading symbol and then leading and trailing spaces
  if (proposalName !== undefined) {
    try {
      proposalName = proposalName.replaceAll('#', '').trim();
    } catch (err) {
      proposalName = undefined;
    }
  }
  return proposalName;
}

async function createMessage(eventName, params, transactionHash, blockExplorerBaseUrl) {
  let description;
  let support;
  let proposalId;
  let proposer;
  let voter;
  let weight;
  let reason;
  let proposalName;
  let message;
  let id;
  let supportEmoji;
  let eta;
  const internationalNumberFormat = new Intl.NumberFormat('en-US');

  let voteTypeString;
  const noEntryEmoji = '⛔';
  const checkMarkEmoji = '✅';
  const speakNoEvilEmoji = '🙊';

  // construct the block explorer transaction link
  const blockExplorerLink = `[TX](<${blockExplorerBaseUrl}/${transactionHash}>)`;

  switch (eventName) {
    case 'ProposalCreated':
      ({ proposer, id, description } = params);
      proposalName = getProposalTitleFromDescription(description);
      if (proposalName === undefined) {
        proposalName = getProposalTitle(id);
      }
      message = `**New Proposal** ${proposalName} by ${proposer.slice(0, 6)} ${blockExplorerLink}`;
      break;
    case 'VoteCast':
      ({
        reason,
        voter,
        weight,
        support,
        proposalId,
      } = params);

      support = Number(support);

      if (support === 0) {
        supportEmoji = noEntryEmoji;
        voteTypeString = '**Vote**';
      } else if (support === 1) {
        supportEmoji = checkMarkEmoji;
        voteTypeString = '**Vote**';
      } else if (support === 2) {
        supportEmoji = speakNoEvilEmoji; // abstain
        voteTypeString = '**Abstain**';
      }

      weight = internationalNumberFormat.format(weight);

      proposalName = getProposalTitle(proposalId);
      message = `${voteTypeString} ${proposalName} ${supportEmoji} ${weight} by ${voter.slice(0, 6)} ${blockExplorerLink}`;

      if (reason !== '') {
        message += `\n\`\`\`${reason}\`\`\``;
      }
      break;
    case 'ProposalCanceled':
      ({ proposalId } = params);
      proposalName = getProposalTitle(proposalId);
      message = `**Canceled Proposal** ${proposalName} ${noEntryEmoji} ${blockExplorerLink}`;
      break;
    case 'ProposalExecuted':
      ({ proposalId } = params);
      proposalName = getProposalTitle(proposalId);
      message = `**Executed Proposal** ${proposalName} ${checkMarkEmoji} ${blockExplorerLink}`;
      break;
    case 'ProposalQueued':
      ({ eta, proposalId } = params);
      proposalName = getProposalTitle(proposalId);
      message = `**Queued Proposal** ${proposalName} ${checkMarkEmoji} available to execute at timestamp ${eta} ${blockExplorerLink}`;
      break;
    default:
      return undefined;
  }

  return message;
}

// eslint-disable-next-line func-names
exports.handler = async function (autotaskEvent) {
  // ensure that the autotaskEvent Object exists
  if (autotaskEvent === undefined) {
    throw new Error('autotaskEvent undefined');
  }

  const { secrets, request } = autotaskEvent;
  if (secrets === undefined) {
    throw new Error('secrets undefined');
  }

  let blockExplorerBaseUrl = secrets[blockExplorerSecretName];
  if (blockExplorerBaseUrl=== undefined) {
    blockExplorerBaseUrl = 'https://etherscan.io/tx';
  }

  // ensure that the request key exists within the autotaskEvent Object
  if (request === undefined) {
    throw new Error('request undefined');
  }

  // ensure that the body key exists within the request Object
  const { body } = request;
  if (body === undefined) {
    throw new Error('body undefined');
  }

  // ensure that the alert key exists within the body Object
  const {
    matchReasons,
    hash: transactionHash,
  } = body;
  if (matchReasons === undefined) {
    throw new Error('matchReasons undefined');
  }

  // create messages
  const promises = matchReasons.map(async (reason) => {
    // determine the type of event it was
    const { signature, params } = reason;
    const eventName = signature.slice(0, signature.indexOf('('));
    // craft the message
    return createMessage(eventName, params, transactionHash, blockExplorerBaseUrl);
  });

  // wait for the promises to settle
  let results = await Promise.allSettled(promises);

  const promisesList = results.map((result) => {
    // if the number of votes cast was less than 1 TOKEN, the resulting message will be undefined
    if (result.value === undefined) {
      // return early, do not attempt to log to console
      return undefined;
    }

    console.log(result.value);
    return;
  });

  results = await Promise.allSettled(promisesList);
  results = results.filter((result) => result.status === 'rejected');

  if (results.length > 0) {
    throw new Error(results[0].reason);
  }

  return {};
};
