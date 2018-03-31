var fs = require('fs')
var express = require('express')
var simpleGit = require('simple-git/promise')
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

async function getLatestCommit (path) {
  return (await getLog(path)).latest
}

async function checkIfOutdated (locale, key) {
  const { sourcePath, localePath } = getPaths(locale, key)

  console.log({ sourcePath, localePath })
  const latestSourceCommit = await getLatestCommit(sourcePath)
  const latestLocaleCommit = await getLatestCommit(localePath)

  const latestSourceCommitDate = new Date(latestSourceCommit.date)
  const latestLocaleCommitDate = new Date(latestLocaleCommit.date)
  console.log({ latestSourceCommit, latestLocaleCommit })
  console.log({ latestSourceCommitDate, latestLocaleCommitDate })

  return latestSourceCommitDate > latestLocaleCommitDate
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
  const { locale, key } = req.query

  const outdated = await checkIfOutdated(locale, key)

  res.send({ outdated })
})

async function run () {
  console.log(await checkIfOutdated('ko', 'GettingStarted.QuickStart.header'))
}

run()

module.exports = router
