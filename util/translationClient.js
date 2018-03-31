import axios from 'axios'

export default {
  async save (data) {
    return axios.put('/api/translation', data)
  },
  async getStatus (data) {
    const query = Object.keys(data).map(k => {
      return `${k}=${data[k]}`
    }).join('&')

    return axios.get(`/api/translation/status?${query}`)
  }
}
