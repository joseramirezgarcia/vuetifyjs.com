const express = require('express')
const simpleGit = require('simple-git/promise')
const diffJson = require('diff-json')
const helpers = require('vuetify/es5/util/helpers')
const fs = require('fs-extra')
const path = require('path')

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
    fileKey: keyParts.join('.')
  }
}

function update (obj, path, value) {
  let pointer = obj
  for (let i = 0; i < path.length; i++) {
    const p = path[i]
    const matches = p.match(/(.*)\[(\d+)\](\.)?/)
    const isArray = matches && matches.length > 1

    const key = isArray ? matches[1] : p

    if (pointer[key] === undefined) pointer[key] = isArray ? [] : {}

    if (i === path.length - 1) {
      if (isArray) pointer[key][matches[2]] = value
      else pointer[key] = value
    } else {
      if (isArray) {
        pointer[key][matches[2]] = {}
        pointer = pointer[key][matches[2]]
      } else pointer = pointer[key]
    }
  }

  return obj
}

async function getLog (path, opts = {}) {
  return git.log({ file: path, ...opts })
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

function getPreviousCommit (log, commit) {
  const targetDate = new Date(commit.date)
  for (let i = 0; i < log.all.length; i++) {
    const currentDate = new Date(log.all[i].date)

    if (currentDate <= targetDate) return log.all[i]
  }

  return null
}

const cache = {}

async function checkIfOutdated (locale, key) {
  const { sourcePath, localePath, fileKey } = getPaths(locale, key)

  // setup cache
  if (!cache[sourcePath]) {
    cache[sourcePath] = {
      logs: null,
      json: {}
    }
  }
  if (!cache[localePath]) {
    cache[localePath] = {
      logs: null,
      json: {}
    }
  }

  // If no file exists yet
  // translation is missing
  if (!fs.existsSync(localePath)) return 'missing'

  // If file exists but
  // key is missing
  const localeJson = await fs.readJson(localePath)
  if (!helpers.getObjectValueByPath(localeJson, fileKey)) return 'missing'

  // Get git logs for both source and locale
  const localeLog = cache[localePath].logs || await getLog(localePath)
  const sourceLog = cache[sourcePath].logs || await getLog(sourcePath)

  // Make sure to cache result
  cache[sourcePath].logs = sourceLog
  cache[localePath].logs = localeLog

  // If file is not commited, there's not much we can do
  if (localeLog.total === 0) return 'unchanged'

  const latestSourceCommitDate = new Date(sourceLog.latest.date)
  const latestLocaleCommitDate = new Date(localeLog.latest.date)

  // If source has been updated after latest locale
  // then we might have a mismatch
  if (latestSourceCommitDate > latestLocaleCommitDate) {
    const previousCommit = getPreviousCommit(sourceLog, localeLog.latest)

    if (!previousCommit) throw new Error('asdasdas')

    const oldJson = cache[sourcePath].json[previousCommit.hash] || await getJsonContent(sourcePath, previousCommit.hash)
    const newJson = cache[sourcePath].json[sourceLog.latest.hash] || await getJsonContent(sourcePath, sourceLog.latest.hash)

    cache[sourcePath].json[previousCommit.hash] = oldJson
    cache[sourcePath].json[sourceLog.latest.hash] = newJson

    const changes = diffJson.diff(oldJson, newJson)
    const change = changes.find(c => c.key === fileKey)

    if (!change) return 'unchanged'

    if (change.type === 'update') return 'updated'
    else if (change.type === 'add') return 'added'
    else if (change.type === 'remove') return 'removed'
    return 'unknown'
  }

  return 'unchanged'
}

async function updateIndexFiles (filePath, defaultExport = true) {
  const dir = path.dirname(filePath)

  const files = (await getAllFiles(dir, true, false)).filter(f => !f.includes('index.js'))

  const exports = files.map(f => path.basename(f, '.json'))
  const imports = exports.map(f => `import ${f} from './${f}'`).join('\n')
  const index = `${imports}\n\nexport ${defaultExport ? 'default ' : ''}{\n${exports.map(e => '  ' + e).join(',\n')}\n}\n`

  await fs.writeFile(`${dir}/index.js`, index)
}

async function updateTranslation (locale, key, value) {
  const { localePath, fileKey } = getPaths(locale, key)

  // if (!fs.existsSync(localePath)) {
  //   await fs.writeJson(localePath, {})
  // }
  if (!fs.existsSync(localePath)) {
    await fs.ensureFile(localePath)
    await fs.writeJson(localePath, {})
  }

  const data = await fs.readJson(localePath)

  update(data, fileKey.split('.'), value)

  console.log(localePath, data)

  await fs.writeJson(localePath, data, { spaces: 2 })

  await updateIndexFiles(localePath)
}

async function getAllFiles (dir, includeDirs = false, recurse = true) {
  return (await fs.readdir(dir)).reduce(async (files, file) => {
    const name = path.join(dir, file)
    const isDirectory = (await fs.stat(name)).isDirectory()

    const f = await files

    // if (isDirectory && includeDirs) f.push(name)

    return isDirectory && recurse ? [...f, ...(await getAllFiles(name))] : [...f, name]
  }, [])
}

async function newTranslation (title, locale, country) {
  const localePath = `./lang/${locale}`

  if (fs.existsSync(localePath)) {
    throw new Error('locale already exists!')
  }

  await fs.ensureDir(localePath)

  const index = `export default {}`

  await fs.writeFile(path.join(localePath, 'index.js'), index)

  const languages = await fs.readJson('./i18n/languages.json')

  languages.push({
    title,
    locale,
    country
  })

  await fs.writeJson('./i18n/languages.json', languages, { spaces: 2 })

  await updateIndexFiles(localePath, false)
}

router.post('/new', async function (req, res) {
  try {
    const { title, locale, country } = req.body

    if (!title || !locale || !country) {
      res.send({ error: 'missing data' })
    }

    await newTranslation(title, locale, country)

    res.send({ status: 'ok' })
  } catch (err) {
    console.log('new', err)
    res.status(500).send({ error: JSON.stringify(err) })
  }
})

router.put('/', async function (req, res) {
  try {
    const { locale, key, value } = req.body

    if (!locale || !key || !value) {
      res.send({ error: 'missing data' })
    }

    await updateTranslation(locale, key, value)

    res.send({ status: 'unchanged' })
  } catch (err) {
    console.log('save', err)
    res.status(500).send({ error: JSON.stringify(err) })
  }
})

router.get('/status', async function (req, res) {
  try {
    const { locale, key } = req.query

    const status = await checkIfOutdated(locale, key)

    res.send({ status })
  } catch (err) {
    console.log('status', err)
    res.status(500).send({ error: JSON.stringify(err) })
  }
})

async function run () {
  // console.log(await checkIfOutdated('ko', 'Components.Alerts.examples.closable.desc'))
  // console.log(await checkIfOutdated('ko', 'Generic.Pages.introduction'))
  // console.log(await updateTranslation('ko', 'GettingStarted.SponsorsAndBackers.header', 'new header'))
  // console.log(await newTranslation('Svenska', 'sv', 'se'))
}

run()

module.exports = router
