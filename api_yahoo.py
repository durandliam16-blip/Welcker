import yfinance as yf
# https://ranaroussi.github.io/yfinance/

def cours_actuel(ticker):
    data = yf.Ticker(ticker)
    prix_actuel = data.fast_info['lastPrice']
    return prix_actuel

if __name__ == "__main__":
    ticker = "H8Y.F"  # Exemple avec Apple Inc.
    prix = cours_actuel(ticker)
    print(f"Le cours actuel de {ticker} est : {prix} USD")