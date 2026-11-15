/* Teks antarmuka: Bahasa Indonesia & English */
window.I18N = {
  id: {
    'nav.home': 'Beranda', 'nav.history': 'Riwayat', 'nav.stats': 'Analisis', 'nav.assets': 'Aset', 'nav.settings': 'Pengaturan',
    'type.income': 'Pemasukan', 'type.expense': 'Pengeluaran',
    'period.today': 'Hari ini', 'period.week': 'Minggu ini', 'period.month': 'Bulan ini', 'period.custom': 'Pilih tanggal',
    'date.today': 'Hari ini', 'date.yesterday': 'Kemarin',

    'action.add': 'Tambah transaksi', 'action.save': 'Simpan', 'action.saveChanges': 'Simpan perubahan', 'action.saving': 'Menyimpan…',
    'action.delete': 'Hapus', 'action.deleting': 'Menghapus…', 'action.cancel': 'Batal', 'action.close': 'Tutup',
    'action.refresh': 'Muat ulang data', 'action.continue': 'Lanjutkan',

    'lock.title': 'Masukkan PIN', 'lock.sub': 'Data keuanganmu terkunci dengan PIN 6 digit.', 'lock.delete': 'Hapus angka',
    'lock.checking': 'Memeriksa PIN…', 'lock.wrong': 'PIN salah. Sisa {n} percobaan.',
    'lock.locked': 'Terlalu banyak percobaan. Coba lagi dalam {m} menit.', 'lock.expired': 'Sesi berakhir. Masukkan PIN lagi.',

    'setup.title': 'Hubungkan ke spreadsheet', 'setup.sub': 'Tempel URL Web App dari Google Apps Script (berakhiran /exec).',
    'setup.url': 'URL Web App', 'setup.save': 'Simpan dan lanjutkan', 'setup.checking': 'Memeriksa…',
    'setup.invalid': 'URL harus diawali https://script.google.com/ dan diakhiri /exec.',

    'sync.loading': 'Memperbarui…', 'sync.updated': 'Diperbarui {time}', 'sync.pending': '{n} menunggu sinkron', 'sync.pendingOne': 'Menunggu sinkron',

    'home.net': 'Saldo bersih', 'home.insights': 'Insight', 'home.recent': 'Transaksi terbaru', 'home.seeAll': 'Lihat semua',
    'home.ratio': 'Kamu sudah memakai {p} dari pemasukan periode ini.',
    'home.ratioOver': 'Pengeluaran melebihi pemasukan sebesar {p}.',
    'home.noIncome': 'Belum ada pemasukan tercatat di periode ini.',

    'ins.top': 'Pengeluaran terbesar', 'ins.topSub': '{v}, atau {p} dari total pengeluaran',
    'ins.avg': 'Rata-rata pengeluaran per hari', 'ins.avgSub': 'Dihitung dari {n} hari',
    'ins.cmp.today': 'Dibanding kemarin', 'ins.cmp.week': 'Dibanding minggu lalu (hari yang sama)',
    'ins.cmp.month': 'Dibanding periode yang sama bulan lalu', 'ins.cmp.custom': 'Dibanding periode sebelumnya',
    'ins.up': 'Pengeluaran naik {p}', 'ins.down': 'Pengeluaran turun {p}', 'ins.same': 'Pengeluaran sama',
    'ins.cmpSub': 'Pengeluaran {a}, sebelumnya {b}', 'ins.cmpInc': 'Pemasukan {a}, sebelumnya {b}',
    'ins.noPrev': 'Belum ada data pembanding',
    'ins.emptyTitle': 'Insight muncul setelah ada pengeluaran', 'ins.empty': 'Catat pengeluaran pertamamu di periode ini.',

    'empty.title': 'Belum ada transaksi', 'empty.text': 'Catat pemasukan atau pengeluaran pertamamu. Cuma butuh beberapa detik.',

    'history.search': 'Cari catatan, kategori, nominal', 'history.all': 'Semua', 'history.allCats': 'Semua kategori',
    'history.from': 'Dari', 'history.to': 'Sampai',
    'history.meta': '{n} transaksi. Masuk {inc}, keluar {exp}.',
    'history.noResult': 'Tidak ada yang cocok', 'history.noResultText': 'Coba kata kunci lain atau longgarkan filter.',
    'history.more': 'Tampilkan {n} lagi',

    'stats.byCategory': 'Pengeluaran per kategori', 'stats.trend': 'Tren pengeluaran', 'stats.daily': 'Harian', 'stats.monthly': '12 bulan',
    'stats.compare': 'Pemasukan vs pengeluaran', 'stats.last6': '6 bulan terakhir', 'stats.showTable': 'Lihat sebagai tabel',
    'stats.other': 'Lainnya', 'stats.month': 'Bulan', 'stats.net': 'Selisih',
    'stats.noExpense': 'Belum ada pengeluaran', 'stats.noExpenseText': 'Grafik muncul setelah ada pengeluaran di periode ini.',
    'stats.noTrend': 'Belum ada pengeluaran untuk ditampilkan.',

    'tx.new': 'Transaksi baru', 'tx.edit': 'Ubah transaksi', 'tx.noCategory': 'Tanpa kategori',
    'tx.noCats': 'Kategori belum ada. Tambahkan di sheet "Dropdown options".',
    'field.amount': 'Nominal', 'field.category': 'Kategori', 'field.method': 'Sumber dana / metode bayar', 'field.date': 'Tanggal',
    'field.notes': 'Catatan', 'field.optional': '(opsional)', 'field.notesPh': 'Contoh: makan siang bareng tim',

    'val.amount': 'Isi nominal lebih dari 0.', 'val.category': 'Pilih salah satu kategori.', 'val.date': 'Tanggal tidak valid.',
    'val.assetValue': 'Isi nilai aset (boleh 0).', 'val.pin6': 'PIN baru harus 6 digit angka.', 'val.pinMatch': 'PIN baru tidak sama. Ketik ulang.',

    'del.title': 'Hapus transaksi ini?', 'del.text': '{cat} {amt} pada {date} akan dihapus dari aplikasi dan spreadsheet.',

    'toast.saved': 'Tersimpan ke spreadsheet', 'toast.updated': 'Perubahan disimpan', 'toast.deleted': 'Transaksi dihapus',
    'toast.saveFailed': 'Gagal menyimpan.', 'toast.updateFailed': 'Perubahan gagal disimpan.', 'toast.deleteFailed': 'Gagal menghapus.',
    'toast.offlineSaved': 'Sedang offline. Transaksi disimpan di perangkat dan dikirim otomatis saat online.',
    'toast.refreshed': 'Data diperbarui', 'toast.assetSaved': 'Nilai aset diperbarui', 'toast.pinChanged': 'PIN diganti. Perangkat lain perlu login ulang.',
    'toast.alreadyGone': 'Transaksi ini sudah tidak ada di spreadsheet.',

    'asset.total': 'Total aset', 'asset.heroSub': 'Dari sheet Aset', 'asset.liquid': 'Likuid', 'asset.nonLiquid': 'Non-likuid',
    'asset.liquidShare': '{p} asetmu likuid, bisa dicairkan dengan cepat.', 'asset.empty': 'Ketuk salah satu aset di bawah untuk mengisi nilainya.',
    'asset.value': 'Nilai', 'asset.location': 'Lokasi / platform', 'asset.locationPh': 'Contoh: BCA, Bibit, Pegadaian',
    'asset.save': 'Perbarui nilai', 'asset.lastUpdate': 'Terakhir diperbarui {d}', 'asset.tapToFill': 'Ketuk untuk isi',
    'asset.missing': 'Sheet Aset tidak ditemukan', 'asset.missingText': 'Pastikan sheet bernama "Aset" dengan header Jenis, Kategori, Nilai masih ada.',

    'welcome.sub': 'Catat pemasukan dan pengeluaran dalam hitungan detik, langsung ke Google Sheets milikmu sendiri.',
    'welcome.google': 'Masuk dengan Google',
    'welcome.privacy': 'Datamu tersimpan di Google Drive-mu sendiri. Aplikasi ini hanya bisa membuka spreadsheet yang dibuat atau kamu pilih di sini.',
    'connect.title': 'Hubungkan spreadsheet', 'connect.sub': 'Buat spreadsheet baru dari template Money Tracker, atau pakai spreadsheet yang sudah ada.',
    'connect.create': 'Buat spreadsheet baru', 'connect.creating': 'Membuat spreadsheet…', 'connect.pick': 'Pilih dari Google Drive',
    'connect.checking': 'Membuka…', 'connect.found': 'Spreadsheet Money Tracker milikmu', 'connect.as': 'Masuk sebagai {e}.',
    'connect.other': 'Pakai akun lain', 'connect.done': 'Terhubung ke "{n}"', 'connect.sheetTitle': 'Catatan Keuangan Money Tracker',
    'connect.pendingFirst': 'Masih ada transaksi yang belum terkirim. Tunggu sampai tersinkron, lalu coba lagi.',
    'settings.changeSheet': 'Ganti spreadsheet', 'settings.account': 'Akun: {e}.',
    'auth.expired': 'Sesi Google berakhir. Masuk lagi untuk melanjutkan.', 'auth.denied': 'Izin tidak diberikan. Ketuk Masuk dengan Google untuk mencoba lagi.',
    'auth.scope': 'Centang izin Google Drive saat masuk, supaya aplikasi bisa menyimpan ke spreadsheet-mu.', 'auth.failed': 'Gagal masuk ke Google. Coba lagi.',
    'err.notConfigured': 'Aplikasi belum dihubungkan ke Google Cloud. Pemilik aplikasi perlu mengisi js/config.js.',
    'err.forbidden': 'Aplikasi tidak punya akses ke spreadsheet ini. Pilih ulang lewat Ganti spreadsheet.',
    'err.templateMismatch': 'Spreadsheet ini tidak punya sheet "Pemasukan" dan "Pengeluaran". Pilih spreadsheet Money Tracker atau buat yang baru.',
    'err.sheetGone': 'Spreadsheet tidak bisa dibuka lagi (mungkin dihapus). Pilih atau buat spreadsheet lagi.',
    'err.noPicker': 'Pemilih file belum diaktifkan oleh pemilik aplikasi.',
    'theme.title': 'Pilih tema', 'theme.all': 'Semua', 'theme.f': 'Cewek', 'theme.m': 'Cowok', 'theme.n': 'Netral', 'theme.pick': 'Pilih warnamu',
    'settings.language': 'Bahasa', 'settings.openSheet': 'Buka spreadsheet', 'settings.changePin': 'Ganti PIN',
    'settings.changeUrl': 'Ganti URL Web App', 'settings.changeUrlText': 'Kamu akan diminta menempel URL Web App yang baru.',
    'settings.logout': 'Keluar dari akun Google',
    'settings.oldPin': 'PIN lama', 'settings.newPin': 'PIN baru (6 digit)', 'settings.confirmPin': 'Ulangi PIN baru', 'settings.savePin': 'Simpan PIN baru',
    'settings.foot': 'Money Tracker versi {v}.', 'settings.lastSync': 'Sinkron terakhir {d}.',

    'logout.title': 'Keluar dari akun Google?', 'logout.text': 'Data di spreadsheet tetap aman di Google Drive-mu. Kamu bisa masuk lagi kapan saja.',
    'logout.pending': 'Ada {n} transaksi yang belum terkirim dan akan hilang jika kamu keluar sekarang.', 'logout.yes': 'Keluar',

    'err.network': 'Tidak bisa terhubung ke server. Periksa internet, lalu coba lagi.', 'err.offline': 'Kamu sedang offline.',
    'err.badResponse': 'Server tidak merespons dengan benar. Pastikan akses Web App diatur ke "Siapa saja".',
    'err.noUrl': 'URL Web App belum diisi.', 'err.notFound': 'Data tidak ditemukan di spreadsheet. Muat ulang lalu coba lagi.',
    'err.conflict': 'Data di spreadsheet berubah. Muat ulang lalu coba lagi.', 'err.header': 'Header kolom di sheet tidak dikenali.',
    'err.notSetup': 'PIN belum diatur. Jalankan setup() di Apps Script.', 'err.validation': 'Data tidak valid.', 'err.generic': 'Terjadi kesalahan.',
    'err.load': 'Gagal memuat data.'
  },

  en: {
    'nav.home': 'Home', 'nav.history': 'History', 'nav.stats': 'Insights', 'nav.assets': 'Assets', 'nav.settings': 'Settings',
    'type.income': 'Income', 'type.expense': 'Expense',
    'period.today': 'Today', 'period.week': 'This week', 'period.month': 'This month', 'period.custom': 'Pick dates',
    'date.today': 'Today', 'date.yesterday': 'Yesterday',

    'action.add': 'Add transaction', 'action.save': 'Save', 'action.saveChanges': 'Save changes', 'action.saving': 'Saving…',
    'action.delete': 'Delete', 'action.deleting': 'Deleting…', 'action.cancel': 'Cancel', 'action.close': 'Close',
    'action.refresh': 'Reload data', 'action.continue': 'Continue',

    'lock.title': 'Enter your PIN', 'lock.sub': 'Your finances are locked with a 6-digit PIN.', 'lock.delete': 'Delete digit',
    'lock.checking': 'Checking PIN…', 'lock.wrong': 'Wrong PIN. {n} attempts left.',
    'lock.locked': 'Too many attempts. Try again in {m} minutes.', 'lock.expired': 'Session ended. Enter your PIN again.',

    'setup.title': 'Connect your spreadsheet', 'setup.sub': 'Paste the Web App URL from Google Apps Script (ends with /exec).',
    'setup.url': 'Web App URL', 'setup.save': 'Save and continue', 'setup.checking': 'Checking…',
    'setup.invalid': 'The URL must start with https://script.google.com/ and end with /exec.',

    'sync.loading': 'Updating…', 'sync.updated': 'Updated {time}', 'sync.pending': '{n} waiting to sync', 'sync.pendingOne': 'Waiting to sync',

    'home.net': 'Net balance', 'home.insights': 'Insights', 'home.recent': 'Recent transactions', 'home.seeAll': 'See all',
    'home.ratio': "You've spent {p} of this period's income.",
    'home.ratioOver': 'Spending is {p} over income.',
    'home.noIncome': 'No income recorded in this period yet.',

    'ins.top': 'Biggest expense', 'ins.topSub': '{v}, or {p} of total spending',
    'ins.avg': 'Average spending per day', 'ins.avgSub': 'Across {n} days',
    'ins.cmp.today': 'Compared with yesterday', 'ins.cmp.week': 'Compared with last week (same days)',
    'ins.cmp.month': 'Compared with the same days last month', 'ins.cmp.custom': 'Compared with the previous period',
    'ins.up': 'Spending up {p}', 'ins.down': 'Spending down {p}', 'ins.same': 'Spending unchanged',
    'ins.cmpSub': 'Spent {a}, previously {b}', 'ins.cmpInc': 'Income {a}, previously {b}',
    'ins.noPrev': 'Nothing to compare yet',
    'ins.emptyTitle': 'Insights appear once you record spending', 'ins.empty': 'Add your first expense for this period.',

    'empty.title': 'No transactions yet', 'empty.text': 'Record your first income or expense. It takes a few seconds.',

    'history.search': 'Search notes, category, amount', 'history.all': 'All', 'history.allCats': 'All categories',
    'history.from': 'From', 'history.to': 'To',
    'history.meta': '{n} transactions. In {inc}, out {exp}.',
    'history.noResult': 'No matches', 'history.noResultText': 'Try another keyword or loosen the filters.',
    'history.more': 'Show {n} more',

    'stats.byCategory': 'Spending by category', 'stats.trend': 'Spending trend', 'stats.daily': 'Daily', 'stats.monthly': '12 months',
    'stats.compare': 'Income vs expenses', 'stats.last6': 'Last 6 months', 'stats.showTable': 'View as table',
    'stats.other': 'Other', 'stats.month': 'Month', 'stats.net': 'Net',
    'stats.noExpense': 'No spending yet', 'stats.noExpenseText': 'The chart appears once there is spending in this period.',
    'stats.noTrend': 'No spending to show yet.',

    'tx.new': 'New transaction', 'tx.edit': 'Edit transaction', 'tx.noCategory': 'No category',
    'tx.noCats': 'No categories yet. Add them in the "Dropdown options" sheet.',
    'field.amount': 'Amount', 'field.category': 'Category', 'field.method': 'Fund source / payment method', 'field.date': 'Date',
    'field.notes': 'Note', 'field.optional': '(optional)', 'field.notesPh': 'e.g. team lunch',

    'val.amount': 'Enter an amount above 0.', 'val.category': 'Pick a category.', 'val.date': 'Invalid date.',
    'val.assetValue': 'Enter the asset value (0 is fine).', 'val.pin6': 'The new PIN must be 6 digits.', 'val.pinMatch': "The new PINs don't match. Type them again.",

    'del.title': 'Delete this transaction?', 'del.text': '{cat} {amt} on {date} will be removed from the app and the spreadsheet.',

    'toast.saved': 'Saved to spreadsheet', 'toast.updated': 'Changes saved', 'toast.deleted': 'Transaction deleted',
    'toast.saveFailed': "Couldn't save.", 'toast.updateFailed': "Couldn't save changes.", 'toast.deleteFailed': "Couldn't delete.",
    'toast.offlineSaved': "You're offline. The transaction is kept on this device and will sync when you're back online.",
    'toast.refreshed': 'Data updated', 'toast.assetSaved': 'Asset value updated', 'toast.pinChanged': 'PIN changed. Other devices need to sign in again.',
    'toast.alreadyGone': 'This transaction is no longer in the spreadsheet.',

    'asset.total': 'Total assets', 'asset.heroSub': 'From the Aset sheet', 'asset.liquid': 'Liquid', 'asset.nonLiquid': 'Non-liquid',
    'asset.liquidShare': '{p} of your assets are liquid and can be cashed out quickly.', 'asset.empty': 'Tap an asset below to fill in its value.',
    'asset.value': 'Value', 'asset.location': 'Location / platform', 'asset.locationPh': 'e.g. BCA, Bibit, Pegadaian',
    'asset.save': 'Update value', 'asset.lastUpdate': 'Last updated {d}', 'asset.tapToFill': 'Tap to fill in',
    'asset.missing': 'Asset sheet not found', 'asset.missingText': 'Make sure the "Aset" sheet with Jenis, Kategori and Nilai headers still exists.',

    'welcome.sub': 'Log income and spending in seconds, straight into your own Google Sheet.',
    'welcome.google': 'Sign in with Google',
    'welcome.privacy': 'Your data stays in your own Google Drive. This app can only open spreadsheets it created or that you pick here.',
    'connect.title': 'Connect a spreadsheet', 'connect.sub': 'Create a new spreadsheet from the Money Tracker template, or use one you already have.',
    'connect.create': 'Create a new spreadsheet', 'connect.creating': 'Creating spreadsheet…', 'connect.pick': 'Pick from Google Drive',
    'connect.checking': 'Opening…', 'connect.found': 'Your Money Tracker spreadsheets', 'connect.as': 'Signed in as {e}.',
    'connect.other': 'Use another account', 'connect.done': 'Connected to "{n}"', 'connect.sheetTitle': 'Money Tracker',
    'connect.pendingFirst': 'Some transactions have not synced yet. Wait until they sync, then try again.',
    'settings.changeSheet': 'Change spreadsheet', 'settings.account': 'Account: {e}.',
    'auth.expired': 'Your Google session ended. Sign in again to continue.', 'auth.denied': 'Permission was not granted. Tap Sign in with Google to try again.',
    'auth.scope': 'Tick the Google Drive permission when signing in so the app can save to your spreadsheet.', 'auth.failed': "Couldn't sign in to Google. Try again.",
    'err.notConfigured': 'This app is not connected to Google Cloud yet. The owner needs to fill in js/config.js.',
    'err.forbidden': "The app can't access this spreadsheet. Pick it again via Change spreadsheet.",
    'err.templateMismatch': 'This spreadsheet has no "Pemasukan" and "Pengeluaran" sheets. Pick a Money Tracker spreadsheet or create a new one.',
    'err.sheetGone': "The spreadsheet can't be opened any more (it may have been deleted). Pick or create one again.",
    'err.noPicker': "The file picker hasn't been enabled by the app owner.",
    'theme.title': 'Choose a theme', 'theme.all': 'All', 'theme.f': 'Feminine', 'theme.m': 'Masculine', 'theme.n': 'Neutral', 'theme.pick': 'Pick your colour',
    'settings.language': 'Language', 'settings.openSheet': 'Open spreadsheet', 'settings.changePin': 'Change PIN',
    'settings.changeUrl': 'Change Web App URL', 'settings.changeUrlText': "You'll be asked to paste the new Web App URL.",
    'settings.logout': 'Sign out of Google',
    'settings.oldPin': 'Current PIN', 'settings.newPin': 'New PIN (6 digits)', 'settings.confirmPin': 'Repeat new PIN', 'settings.savePin': 'Save new PIN',
    'settings.foot': 'Money Tracker version {v}.', 'settings.lastSync': 'Last synced {d}.',

    'logout.title': 'Sign out of Google?', 'logout.text': 'Your spreadsheet stays safe in your Google Drive. You can sign in again any time.',
    'logout.pending': '{n} transactions have not synced yet and will be lost if you sign out now.', 'logout.yes': 'Sign out',

    'err.network': "Can't reach the server. Check your internet and try again.", 'err.offline': "You're offline.",
    'err.badResponse': 'The server responded unexpectedly. Make sure Web App access is set to "Anyone".',
    'err.noUrl': 'The Web App URL is missing.', 'err.notFound': 'Not found in the spreadsheet. Reload and try again.',
    'err.conflict': 'The spreadsheet changed. Reload and try again.', 'err.header': "The sheet's column headers weren't recognised.",
    'err.notSetup': 'PIN not set. Run setup() in Apps Script.', 'err.validation': 'Invalid data.', 'err.generic': 'Something went wrong.',
    'err.load': "Couldn't load data."
  }
};
