/**
 * Composable for loading page operations
 * Replaces loadingPageMixins
 */
export function useLoadingPage() {
  function hideLoadingPage(): void {
    const loadingPage = document.querySelector('#loading-page')
    if (loadingPage) {
      loadingPage.remove()
    }
  }

  return {
    hideLoadingPage
  }
}
