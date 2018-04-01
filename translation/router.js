var fs = require('fs')
var express = require('express')
var simpleGit = require('simple-git/promise')
var diffJson = require('diff-json')
var router = express.Router()

var git = simpleGit()

function kebab (str) {
  return (str || '').replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
}

function getPaths (locale, key) {
  const parts = key.split('.')
  const fileParts = parts.filter(p => p[0] === p[0].toUpperCase())
  const folderParts = fileParts.slice(0, -1).map(kebab).join('/')
  const fileName = fileParts.slice(-1)
  const keyParts = parts.filter(p => p[0] === p[0].toLowerCase())

  return {
    sourcePath: `./lang/en/${folderParts}/${fileName}.json`,
    localePath: `./lang/${locale}/${folderParts}/${fileName}.json`,
    keyPath: keyParts
  }
}

function update (obj, path, value) {
  const key = path.pop()
  const pointer = path.reduce((accumulator, currentValue) => {
    if (accumulator[currentValue] === undefined) accumulator[currentValue] = {}
    return accumulator[currentValue]
  }, obj)
  pointer[key] = value

  return obj
}

async function loadJson (path) {
  return new Promise((resolve, reject) => {
    fs.readFile(path, 'utf8', (err, data) => {
      if (err) return reject(err)

      return resolve(JSON.parse(data))
    })
  })
}

async function saveJson (path, data) {
  return new Promise((resolve, reject) => {
    fs.writeFile(path, JSON.stringify(data, null, 2), 'utf8', (err, data) => {
      if (err) return reject(err)

      return resolve()
    })
  })
}

async function getLog (path, opts = {}) {
  return git.log({ file: path, ...opts })
}

async function getLatestCommit (path, opts = {}) {
  return (await getLog(path, opts)).latest
}

async function getJsonContent (path, hash) {
  const raw = await git.raw([
      'show',
      `${hash}:./${path}`
  ])

  try {
    return JSON.parse(raw)
  } catch (err) {
    return {}
  }
}

async function getFirstCommitHash () {
  return (await git.raw([
    'rev-list',
    '--max-parents=0',
    'HEAD'
  ])).replace('\ne', '')
}

function getPreviousCommit (log, commit) {
  const targetDate = new Date(commit.date)
  for (let i = 0; i < log.all.length; i++) {
    const currentDate = new Date(log.all[i].date)

    if (currentDate <= targetDate) return log.all[i]
  }

  return null
}

async function checkIfOutdated (locale, key) {
  const { sourcePath, localePath } = getPaths(locale, key)
  const keyParts = key.split('.')

  const sourceLog = await getLog(sourcePath)
  const localeLog = await getLog(localePath)

  const latestSourceCommitDate = new Date(sourceLog.latest.date)
  const latestLocaleCommitDate = new Date(localeLog.latest.date)

  if (latestSourceCommitDate > latestLocaleCommitDate) {
    const previousCommit = getPreviousCommit(sourceLog, localeLog.latest)

    if (!previousCommit) throw new Error('asdasdas')

    const oldJson = await getJsonContent(sourcePath, previousCommit.hash)
    const newJson = await getJsonContent(sourcePath, sourceLog.latest.hash)

    const changes = diffJson.diff(oldJson, newJson)
    const change = changes.find(c => c.key === keyParts[keyParts.length - 1])

    if (change.type === 'update') return 'updated'
    else if (change.type === 'add') return 'added'
    else return 'unknown'
  }

  return 'unchanged'
}

// middleware that is specific to this router
router.use(function timeLog (req, res, next) {
  console.log('Time: ', Date.now())
  next()
})

router.put('/', async function (req, res) {
  const { locale, key, value } = req.body

  if (!locale || !key || !value) {
    res.send({ error: 'missing data' })
  }

  const { localePath, keyPath } = getPaths(locale, key)

  const data = await loadJson(localePath)

  update(data, keyPath, value)

  await saveJson(localePath, data)

  res.send({ localePath, keyPath, data, value })
})

router.get('/status', async function (req, res) {
  try {
    const { locale, key } = req.query

    const status = await checkIfOutdated(locale, key)

    res.send({ status })
  } catch (err) {
    res.send({ err })
  }
})

async function run () {
  console.log(await checkIfOutdated('ko', 'GettingStarted.QuickStart.header'))
}

run()

module.exports = router
