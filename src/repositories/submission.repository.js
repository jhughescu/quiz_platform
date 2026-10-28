const mongoose = require('mongoose');
const Submission = require("../models/Submission");

function create(data) {
  return Submission.create(data);
}

function findAll() {
  return findAllWithDeployment();
}
function findAllByDeploymentOwner(ownerId) {
  return findAllWithDeployment(ownerId);
}
function findAllWithDeployment(ownerId) {
  const pipeline = [
    {
      $lookup: {
        from: "deployments",
        localField: "deploymentId",
        foreignField: "_id",
        as: "deployment",
      },
    },
    {
      $unwind: "$deployment",
    },
  ];
  if (ownerId) {
    pipeline.push({
      $match: {
        "deployment.createdBy": new (require("mongoose").Types.ObjectId)(
          ownerId,
        ),
      },
    });
  }
  pipeline.push(
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $project: {
        "deployment.questions": 0,
        "deployment.__v": 0,
      },
    },
  );
  return Submission.aggregate(pipeline);
}

async function findById(id) {
  const results = await Submission.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(id)
      }
    },
    {
      $lookup: {
        from: 'deployments',
        localField: 'deploymentId',
        foreignField: '_id',
        as: 'deployment'
      }
    },
    {
      $unwind: '$deployment'
    },
    {
      $project: {
        'deployment.questions': 0,
        'deployment.__v': 0
      }
    }
  ]);
  return results[0] || null;
}

function updateById(id, data) {
  return Submission.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });
}

module.exports = { create, findAll, findAllByDeploymentOwner, findById, updateById };
