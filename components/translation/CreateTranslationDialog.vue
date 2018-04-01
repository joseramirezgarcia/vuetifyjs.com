<template lang="pug">
  v-dialog(v-model="show" max-width="50%")
    v-card
      v-card-title(class="primary")
        h3(class="white--text") Create new translation
      v-card-text
        v-text-field(
          label="Title"
          v-model="title"
          placeholder="English"
        )
        v-text-field(
          label="Locale"
          v-model="locale"
          placeholder="en"
        )
        v-text-field(
          label="Country"
          v-model="country"
          placeholder="us"
        )
        v-btn(@click="create") create
</template>

<script>
  export default {
    data () {
      return {
        title: '',
        locale: '',
        country: ''
      }
    },
    computed: {
      show: {
        get () {
          return this.$store.state.translation.showCreateDialog
        },
        set (v) {
          this.$store.commit('translation/SHOW_CREATE_DIALOG', v)
        }
      }
    },
    methods: {
      async create () {
        try {
          const payload = {
            title: this.title,
            locale: this.locale,
            country: this.country
          }

          const response = await this.$store.dispatch('translation/new', payload)
          console.log(response)

          if (response.status === 200) {
            // TODO: change to newly created language
          }
        } catch (err) {
          console.log(err)
        } finally {
          this.$store.commit('translation/SHOW_CREATE_DIALOG', false)
        }
      }
    }
  }
</script>
