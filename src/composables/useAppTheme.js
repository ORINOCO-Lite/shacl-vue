import { useTheme } from 'vuetify'
import { computed } from 'vue'

export function useAppTheme(config) {

    const theme = useTheme()
    const isDark = computed(() => theme.global.current.value.dark)

    function toggleTheme() {
        theme.global.name.value = theme.global.name.value === 'light' ? 'dark' : 'light'
    }

    return {
        theme,
        isDark,
        toggleTheme,
    };

}
