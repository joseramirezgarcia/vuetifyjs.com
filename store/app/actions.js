import translationClient from "../../util/translationClient"

export default {
  async getTranslationStatus ({ commit }, payload) {
    return translationClient.getStatus(payload)
  }
}
